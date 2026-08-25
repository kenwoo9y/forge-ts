/**
 * Input data type for the create-user use case.
 */
export type CreateUserInput = {
  /** Username */
  username: string;
  /** Plain-text password */
  password: string;
};

/**
 * Output data type for the create-user use case.
 */
export type CreateUserOutput = {
  /** Username */
  username: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Update timestamp */
  updatedAt: Date;
};

/**
 * Read-only model of a user.
 * A flat data structure returned directly from the data store by the query service.
 */
export type UserReadModel = {
  /** Internal ID */
  id: bigint;
  /** Username */
  username: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Update timestamp */
  updatedAt: Date;
};
