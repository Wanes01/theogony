export class AppError<C extends string = string> extends Error {
  constructor(
    readonly code: C,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = code;
  }
}

/** Simple errors factory */
export function defineError<const C extends string>(code: C) {
  return class extends AppError<C> {
    constructor(message: string, options?: ErrorOptions) {
      super(code, message, options);
    }
  };
}

export class IllegalArgumentError extends defineError("ILLEGAL_ARGUMENT") {}
export class IllegalStateError extends defineError("ILLEGAL_STATE") {}
export class NotFoundError extends defineError("NOT_FOUND") {}
