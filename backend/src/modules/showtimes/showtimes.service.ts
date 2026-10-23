import { Injectable } from "@nestjs/common";
import { Prisma, Showtime } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { Page, pageOf } from "../../common/dto/pagination.dto";
import { UnitOfWork } from "../../database/unit-of-work";
import { MoviesRepository } from "../movies/movies.repository";
import { RoomsRepository } from "../rooms/rooms.repository";
import {
  CreateShowtimeDto,
  ProgrammeDto,
  ListShowtimesDto,
  ShowtimeDto,
  UpdateShowtimeDto,
} from "./showtime.dto";
import { ShowtimesRepository } from "./showtimes.repository";

const CLEANING_MINUTES = 15;
class ScheduleSnapshotChanged extends Error {}

@Injectable()
export class ShowtimesService {
  constructor(
    private readonly showtimes: ShowtimesRepository,
    private readonly movies: MoviesRepository,
    private readonly rooms: RoomsRepository,
    private readonly database: UnitOfWork,
  ) {}

  private serialize(row: Showtime): ShowtimeDto {
    return { ...row, baseTicketPrice: row.baseTicketPrice.toFixed(2) };
  }

  private async requireShowtime(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Showtime> {
    const row = await this.showtimes.find(id, tx);
    if (!row)
      throw new ApiException(
        404,
        "SHOWTIME_NOT_FOUND",
        "Showtime was not found.",
      );
    return row;
  }

  async get(id: string): Promise<ShowtimeDto> {
    return this.serialize(await this.requireShowtime(id));
  }

  list(query: ListShowtimesDto): Promise<Page<ShowtimeDto>> {
    const now = new Date();
    return this.database.transaction(async (tx) => {
      const [items, total] = await this.showtimes.page(query, now, tx);
      return pageOf(
        items.map((row) => this.serialize(row)),
        total,
        query,
      );
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }

  programme(days: number): Promise<ProgrammeDto> {
    return this.database.transaction(async (tx) => {
      const [clock] = await tx.$queryRaw<
        Array<{ now: Date }>
      >`SELECT clock_timestamp() AS now`;
      if (!clock) throw new Error("Database clock unavailable.");
      const until = new Date(clock.now.getTime() + days * 86400000);
      const [movies, cinemas, rooms, combos, showtimes] =
        await this.showtimes.programme(clock.now, until, tx);
      if (
        movies.length > 1000 ||
        cinemas.length > 1000 ||
        rooms.length > 2000 ||
        combos.length > 1000 ||
        showtimes.length > 10000
      )
        throw new ApiException(
          422,
          "PROGRAMME_WINDOW_TOO_LARGE",
          "Lịch vượt giới hạn tải. Hãy thu hẹp số ngày để tải đầy đủ dữ liệu.",
        );
      return {
        movies,
        cinemas,
        rooms,
        combos: combos.map((combo) => ({
          ...combo,
          price: combo.price.toFixed(2),
        })),
        showtimes: showtimes.map((show) => this.serialize(show)),
        asOf: clock.now,
        until,
      };
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }

  // All schedule writers lock catalog parents in this order, then the showtime.
  private async lockParents(
    movieIds: string[],
    roomIds: string[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    for (const id of [
      ...new Set(movieIds.map((id) => id.toLowerCase())),
    ].sort())
      await this.movies.lock(id, tx);
    for (const id of [...new Set(roomIds.map((id) => id.toLowerCase()))].sort())
      await this.rooms.lock(id, tx);
  }

  private async endTime(
    movieId: string,
    roomId: string,
    startTime: Date,
    tx: Prisma.TransactionClient,
  ): Promise<Date> {
    const movie = await this.movies.find(movieId, tx);
    if (!movie)
      throw new ApiException(404, "MOVIE_NOT_FOUND", "Movie was not found.");
    if (movie.status === "ENDED")
      throw new ApiException(
        409,
        "MOVIE_NOT_ON_SALE",
        "Ended movies cannot receive new schedules.",
      );
    if (!(await this.rooms.find(roomId, tx)))
      throw new ApiException(404, "ROOM_NOT_FOUND", "Room was not found.");
    const end = new Date(
      startTime.getTime() + (movie.durationMinutes + CLEANING_MINUTES) * 60000,
    );
    if (
      !Number.isFinite(end.getTime()) ||
      end.getUTCFullYear() > 9999 ||
      startTime.getUTCFullYear() < 1
    ) {
      throw new ApiException(
        400,
        "VALIDATION_ERROR",
        "Showtime must fit within years 0001 through 9999 UTC.",
      );
    }
    return end;
  }

  async validateNoScheduleConflict(
    roomId: string,
    startTime: Date,
    endTime: Date,
    tx: Prisma.TransactionClient,
    excludeShowtimeId?: string,
  ): Promise<void> {
    if (
      await this.showtimes.overlap(
        roomId,
        startTime,
        endTime,
        tx,
        excludeShowtimeId,
      )
    )
      throw scheduleConflict();
  }

  private async mutate<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.database.transaction(operation);
      } catch (error) {
        // PostgreSQL exclusion is the final arbiter, including writers bypassing this service.
        if (isScheduleExclusion(error)) throw scheduleConflict();
        if (
          !(error instanceof ScheduleSnapshotChanged) &&
          !isTransactionConflict(error)
        )
          throw error;
      }
    }
    throw new ApiException(
      409,
      "SHOWTIME_CHANGED",
      "Schedule changed concurrently. Reload and retry.",
    );
  }

  async create(dto: CreateShowtimeDto): Promise<ShowtimeDto> {
    return this.mutate(async (tx) => {
      await this.lockParents([dto.movieId], [dto.roomId], tx);
      const startTime = new Date(dto.startTime);
      const endTime = await this.endTime(
        dto.movieId,
        dto.roomId,
        startTime,
        tx,
      );
      await this.validateNoScheduleConflict(dto.roomId, startTime, endTime, tx);
      return this.serialize(
        await this.showtimes.create(
          {
            movieId: dto.movieId,
            roomId: dto.roomId,
            startTime,
            endTime,
            baseTicketPrice: new Prisma.Decimal(dto.baseTicketPrice),
          },
          tx,
        ),
      );
    });
  }

  private async lockCurrent(
    id: string,
    dto: UpdateShowtimeDto,
    tx: Prisma.TransactionClient,
  ): Promise<Showtime> {
    const snapshot = await this.requireShowtime(id, tx);
    await this.lockParents(
      [snapshot.movieId, dto.movieId ?? snapshot.movieId],
      [snapshot.roomId, dto.roomId ?? snapshot.roomId],
      tx,
    );
    await this.showtimes.lock(id, tx);
    const current = await this.requireShowtime(id, tx);
    // A concurrent move may have changed which parents need locking. Restart with the new set.
    if (
      snapshot.movieId !== current.movieId ||
      snapshot.roomId !== current.roomId
    )
      throw new ScheduleSnapshotChanged();
    return current;
  }

  async update(id: string, dto: UpdateShowtimeDto): Promise<ShowtimeDto> {
    return this.mutate(async (tx) => {
      const current = await this.lockCurrent(id, dto, tx);
      const movieId = (dto.movieId ?? current.movieId).toLowerCase();
      const roomId = (dto.roomId ?? current.roomId).toLowerCase();
      const startTime =
        dto.startTime === undefined
          ? current.startTime
          : new Date(dto.startTime);
      const price =
        dto.baseTicketPrice === undefined
          ? current.baseTicketPrice
          : new Prisma.Decimal(dto.baseTicketPrice);
      if (
        movieId === current.movieId &&
        roomId === current.roomId &&
        startTime.getTime() === current.startTime.getTime() &&
        price.equals(current.baseTicketPrice)
      )
        return this.serialize(current);
      await this.requireUnused(id, tx);
      const endTime = await this.endTime(movieId, roomId, startTime, tx);
      await this.validateNoScheduleConflict(roomId, startTime, endTime, tx, id);
      return this.serialize(
        await this.showtimes.update(
          id,
          { movieId, roomId, startTime, endTime, baseTicketPrice: price },
          tx,
        ),
      );
    });
  }

  private async requireUnused(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (await this.showtimes.hasBookings(id, tx))
      throw new ApiException(
        409,
        "SHOWTIME_IN_USE",
        "Showtime has booking history and cannot be changed or deleted.",
      );
  }

  delete(id: string) {
    return this.mutate(async (tx) => {
      await this.lockCurrent(id, new UpdateShowtimeDto(), tx);
      await this.requireUnused(id, tx);
      await this.showtimes.delete(id, tx);
      return { id, deleted: true };
    });
  }
}

function scheduleConflict(): ApiException {
  return new ApiException(
    409,
    "SHOWTIME_CONFLICT",
    "This room already has an overlapping showtime, including cleaning time.",
  );
}

function isScheduleExclusion(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) &&
    !(error instanceof Prisma.PrismaClientUnknownRequestError)
  )
    return false;
  const detail =
    error instanceof Prisma.PrismaClientKnownRequestError &&
    typeof error.meta?.database_error === "string"
      ? error.meta.database_error
      : "";
  const message = `${error.message} ${detail}`;
  return (
    message.includes("showtimes_no_room_overlap") &&
    /23P01|exclusion constraint/i.test(message)
  );
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" ||
      (error.code === "P2010" && error.meta?.code === "40P01"))
  );
}
