import { toNestErrors } from "@hookform/resolvers";
import type { FieldValues, Resolver, ResolverOptions } from "react-hook-form";
import type { ZodSchema } from "zod";

export function zodResolver<T extends FieldValues>(
  schema: ZodSchema,
): Resolver<T> {
  return async (values: T, _context: unknown, options: ResolverOptions<T>) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data as T, errors: {} };
    }

    const flatErrors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!flatErrors[path]) {
        flatErrors[path] = {
          type: issue.code as string,
          message: issue.message,
        };
      }
    }

    return {
      values: {},
      errors: toNestErrors(flatErrors, options),
    };
  };
}
