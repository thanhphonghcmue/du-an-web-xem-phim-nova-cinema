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
  create(dto: CreateMovieDto): Promise<MovieDto> {
    return this.movies.create({
      title: dto.title,
      description: dto.description,
      durationMinutes: dto.durationMinutes,
      releaseDate: new Date(dto.releaseDate),
      ageRating: dto.ageRating,
      status: dto.status || MovieStatus.COMING_SOON,
      trailerUrl: dto.trailerUrl ?? null,
      posterUrl: dto.posterUrl ?? null,
    });
  }
  update(id: string, dto: UpdateMovieDto): Promise<MovieDto> {
    return this.database.transaction(async (tx) => {
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
        ...(dto.title !== undefined ? { title: dto.title } : {}),
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
        ...(dto.trailerUrl !== undefined ? { trailerUrl: dto.trailerUrl } : {}),
        ...(dto.posterUrl !== undefined ? { posterUrl: dto.posterUrl } : {}),
      };
      return this.movies.update(id, changes, tx);
    });
  }
  delete(id: string) {
    return this.database.transaction(async (tx) => {
      await this.movies.lock(id, tx);
      await this.get(id, tx);
      if (await this.movies.hasShowtimes(id, tx))
        throw new ApiException(
          409,
          "MOVIE_IN_USE",
          "Movie is referenced by showtimes; mark it ENDED instead.",
        );
      await this.movies.delete(id, tx);
      return { id, deleted: true };
    });
  }
}
