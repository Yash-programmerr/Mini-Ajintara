/**
 * Builds an Express middleware from a map of zod schemas: { body, query, params }.
 *
 * Express 5 exposes req.query as a getter, so parsed query data is stored on
 * req.validatedQuery instead of being assigned back.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
      if (schemas.params) req.validatedParams = schemas.params.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
}
