import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** Express 4 não captura rejeições de handlers async — este wrapper encaminha ao error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
