/** DTOs alignés sur le backend Spring (`com.baticonnecte.baticonnecte.dto`). */

export type UserRole = 'ADMIN' | 'CLIENT' | 'OUVRIER';
export type Statut = 'ACTIF' | 'NON_ACTIF';

/** POST /auth/register — RegisterUserDto */
export interface RegisterUserDto {
  nomComplet: string;
  adresse: string;
  ville: string;
  email: string;
  password: string;
  role: UserRole;
}

/** POST /auth/login — LoginUserDto */
export interface LoginUserDto {
  email: string;
  password: string;
}

/** Réponse login (Map du AuthController, pas un record). */
export interface LoginResponse {
  token: string;
  id: string;
  /** Égal au nomComplet côté backend. */
  username: string;
  email: string;
  role: UserRole | string;
}

/** GET /auth/me — UserResponseDto */
export interface UserResponseDto {
  id: string;
  nomComplet: string;
  email: string;
  adresse: string;
  ville: string;
  role: string;
  statut: Statut | string;
  createdAt?: string;
}

/** GET /users et GET /users/{id} — getUserByIdResponseDto */
export interface GetUserByIdResponseDto {
  id: string;
  nomComplet: string;
  adresse: string;
  ville: string;
  email: string;
  statut: Statut | string;
  role: UserRole | string;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /profiles et GET /profiles/user/{userId} — GetProfileDto */
export interface GetProfileDto {
  id: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  userId: string;
  nomComplet: string;
  email: string;
  adresse: string;
  ville: string;
  metierId: string | null;
  /** Nom du métier (pas le nom de l’utilisateur). */
  nom: string | null;
}

/** POST /profiles — CreateMetierDto (création de profil ouvrier) */
export interface CreateProfileDto {
  userId: string;
  metierId: string;
  description: string;
}

/** POST /metiers et PATCH /metiers/{id} — MetierDto */
export interface MetierDto {
  nom: string;
  description?: string;
  statut?: Statut | string;
}

/** GET /metiers — MetierDtoResponse */
export interface MetierDtoResponse {
  id: string;
  nom: string;
  description?: string;
  statut?: Statut | string;
  createdAt?: string;
  updatedAt?: string;
}

/** POST /posts (multipart) — CreatePostDto + file */
export interface CreatePostDto {
  titre: string;
  description: string;
  userId?: string;
}

/** POST /posts réponse — PostDto (`image` = URL Cloudinary) */
export interface PostDto {
  id: string;
  titre: string;
  description: string;
  image: string;
  userId: string;
}

/** GET /posts et GET /posts/{id} — PostResponseDto */
export interface PostResponseDto {
  id: string;
  titre: string;
  description: string;
  imageUrl: string;
  userId: string;
  fullName: string;
  createdAt?: string;
  updatedAt?: string;
}

/** PATCH /posts/{id} — UpdatePostDto + file */
export interface UpdatePostDto {
  titre?: string;
  description?: string;
}

/** PageResponseDto<T> */
export interface PageResponseDto<T> {
  data: T[];
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
}
