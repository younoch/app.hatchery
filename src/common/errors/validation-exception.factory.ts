import { HttpStatus, ValidationError } from '@nestjs/common';
import { AppException, FieldError } from './app.exception';
import { ErrorCode } from './error-codes';

const NUMBER = /-?\d+(?:\.\d+)?/;

// class-validator does not hand over the constraint values, so params are
// read from its default message ("... longer than or equal to 6 characters").
function numberFrom(message: string): number | undefined {
  const match = NUMBER.exec(message);
  return match ? Number(match[0]) : undefined;
}

function toFieldError(
  field: string,
  key: string,
  message: string,
  value: unknown,
): FieldError {
  if (key === 'whitelistValidation') {
    return { field, code: ErrorCode.NOT_ALLOWED };
  }
  if (value === undefined || value === null || key === 'isNotEmpty') {
    return { field, code: ErrorCode.REQUIRED };
  }
  const n = numberFrom(message);
  switch (key) {
    case 'minLength':
      return { field, code: ErrorCode.TOO_SHORT, params: { min: n } };
    case 'maxLength':
      return { field, code: ErrorCode.TOO_LONG, params: { max: n } };
    case 'min':
      return { field, code: ErrorCode.OUT_OF_RANGE, params: { min: n } };
    case 'max':
      return { field, code: ErrorCode.OUT_OF_RANGE, params: { max: n } };
    case 'isUuid':
      return { field, code: ErrorCode.INVALID_UUID };
    case 'isISO8601':
    case 'isDateString':
      return { field, code: ErrorCode.INVALID_DATETIME };
    case 'isString':
    case 'isNumber':
    case 'isInt':
    case 'isBoolean':
    case 'isArray':
    case 'isEnum':
      return { field, code: ErrorCode.INVALID_TYPE };
    case 'arrayMinSize':
      return { field, code: ErrorCode.TOO_SHORT, params: { min: n } };
    case 'arrayMaxSize':
      return { field, code: ErrorCode.TOO_LONG, params: { max: n } };
    case 'arrayMinSize':
      return { field, code: ErrorCode.TOO_SHORT, params: { min: n } };
    case 'arrayMaxSize':
      return { field, code: ErrorCode.TOO_LONG, params: { max: n } };
    case 'isIn':
      return { field, code: ErrorCode.NOT_ALLOWED };
    case 'matches':
      if (message.includes('one letter and one number')) {
        return { field, code: ErrorCode.WEAK_PASSWORD };
      }
      if (field === 'username' || field.endsWith('.username')) {
        return { field, code: ErrorCode.INVALID_USERNAME };
      }
      return { field, code: ErrorCode.INVALID_FORMAT };
    default:
      // isEmail, matches, custom decorators, ...
      return { field, code: ErrorCode.INVALID_FORMAT };
  }
}

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(([key, message]) =>
      toFieldError(field, key, message, error.value),
    );
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

// One field can fail several decorators. A missing value or a wrong type is
// the root cause: when it is present, the length or range errors of that
// field are noise, so only the root cause is reported, once.
function dedupe(errors: FieldError[]): FieldError[] {
  const root = new Map<string, FieldError>();
  for (const code of [ErrorCode.REQUIRED, ErrorCode.INVALID_TYPE]) {
    for (const error of errors) {
      if (error.code === code && !root.has(error.field)) {
        root.set(error.field, error);
      }
    }
  }
  const seen = new Set<string>();
  return errors.flatMap((error) => {
    const picked = root.get(error.field) ?? error;
    const key = `${picked.field}:${picked.code}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [picked];
  });
}

export function toFieldErrors(errors: ValidationError[]): FieldError[] {
  return dedupe(flatten(errors));
}

export function validationExceptionFactory(
  errors: ValidationError[],
): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    ErrorCode.VALIDATION_FAILED,
    'Validation failed',
    toFieldErrors(errors),
  );
}
