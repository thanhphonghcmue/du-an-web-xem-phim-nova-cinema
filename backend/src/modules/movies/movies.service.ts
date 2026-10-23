import { AuditService } from "../audit/audit.service";
import { Injectable } from "@nestjs/common";
import { MovieStatus, Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { Page, pageOf } from "../../common/dto/pagination.dto";
import { UnitOfWork } from "../../database/unit-of-work";
import { MoviesRepository } from "./movies.repository";
import {
  CreateMovieDto,
  ListMoviesDto,
  MovieDto,
  UpdateMovieDto,
} from "./movie.dto";
@Injectable()
export class MoviesService {
  constructor(
    private readonly movies: MoviesRepository,
    private readonly database: UnitOfWork,
    private readonly audit: AuditService,
  ) {}
  async get(id: string, tx?: Prisma.TransactionClient): Promise<MovieDto> {
    const movie = await this.movies.find(id, tx);
    if (!movie)
      throw new ApiException(404, "MOVIE_NOT_FOUND", "Movie was not found.");
    return movie;
  }
  list(query: ListMoviesDto): Promise<Page<MovieDto>> {
    return this.database.transaction(async (tx) => {
      const [items, total] = await this.movies.page(query, tx);
      return pageOf(items, total, query);
    }, Prisma.TransactionIsolationLevel.RepeatableRead);
  }
  create(dto: CreateMovieDto, actorId: string): Promise<MovieDto> {
    return this.uniqueTitle(() =>
      this.database.transaction(async (tx) => {
        const movie = await this.movies.create(
          {
            title: this.title(dto.title),
            description: dto.description,
            durationMinutes: dto.durationMinutes,
            releaseDate: new Date(dto.releaseDate),
            ageRating: dto.ageRating,
            status: dto.status || MovieStatus.COMING_SOON,
            trailerUrl: dto.trailerUrl ?? null,
            posterUrl: dto.posterUrl ?? null,
          },
          tx,
        );
        await this.audit.record(
          {
            actorId,
            action: "CREATE",
            entityType: "MOVIE",
            entityId: movie.id,
            summary: movie.title,
            changes: { after: this.snapshot(movie) },
          },
          tx,
        );
        return movie;
      }),
    );
  }
  update(id: string, dto: UpdateMovieDto, actorId: string): Promise<MovieDto> {
    return this.uniqueTitle(() =>
      this.database.transaction(async (tx) => {
        await this.movies.lock(id, tx);
        const current = await this.get(id, tx);
        if (
          dto.durationMinutes !== undefined &&
          dto.durationMinutes !== current.durationMinutes &&
          (await this.movies.hasShowtimes(id, tx))
        )
          throw new ApiException(
            409,
            "MOVIE_DURATION_LOCKED",
            "Duration cannot change after showtimes reference this movie.",
          );
        const changes: Prisma.MovieUpdateInput = {
          ...(dto.title !== undefined ? { title: this.title(dto.title) } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.durationMinutes !== undefined
            ? { durationMinutes: dto.durationMinutes }
            : {}),
          ...(dto.releaseDate !== undefined
            ? { releaseDate: new Date(dto.releaseDate) }
            : {}),
          ...(dto.ageRating !== undefined ? { ageRating: dto.ageRating } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.trailerUrl !== undefined
            ? { trailerUrl: dto.trailerUrl }
            : {}),
          ...(dto.posterUrl !== undefined ? { posterUrl: dto.posterUrl } : {}),
        };
        const movie = await this.movies.update(id, changes, tx);
        const before = this.snapshot(current),
          after = this.snapshot(movie);
        if (JSON.stringify(before) !== JSON.stringify(after))
          await this.audit.record(
            {
              actorId,
              action: "UPDATE",
              entityType: "MOVIE",
              entityId: id,
              summary: movie.title,
              changes: { before, after },
            },
            tx,
          );
        return movie;
      }),
    );
  }
  delete(id: string, actorId: string) {
    return this.database.transaction(async (tx) => {
      await this.movies.lock(id, tx);
      const current = await this.get(id, tx);
      if (await this.movies.hasShowtimes(id, tx))
        throw new ApiException(
          409,
          "MOVIE_IN_USE",
          "Movie is referenced by showtimes; mark it ENDED instead.",
        );
      await this.movies.delete(id, tx);
      await this.audit.record(
        {
          actorId,
          action: "DELETE",
          entityType: "MOVIE",
          entityId: id,
          summary: current.title,
          changes: { before: this.snapshot(current) },
        },
        tx,
      );
      return { id, deleted: true };
    });
  }
  private title(value: string): string {
    return value.normalize("NFC").trim().replace(/\s+/g, " ");
  }
  private snapshot(movie: MovieDto): Prisma.InputJsonObject {
    return {
      title: movie.title,
      description: movie.description,
      durationMinutes: movie.durationMinutes,
      releaseDate: movie.releaseDate.toISOString(),
      ageRating: movie.ageRating,
      status: movie.status,
      posterUrl: movie.posterUrl,
      trailerUrl: movie.trailerUrl,
    };
  }
  private async uniqueTitle<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ApiException(
          409,
          "MOVIE_TITLE_EXISTS",
          "Phim đã tồn tại trong hệ thống. Vui lòng kiểm tra tên phim.",
        );
      throw error;
    }
  }
}
