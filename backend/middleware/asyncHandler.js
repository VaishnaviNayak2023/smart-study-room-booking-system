import express from 'express';

/**
 * Wrap async route handlers so rejected promises reach Express error middleware.
 * Express 4 does not catch async errors automatically.
 */
export function asyncHandler(fn) {
  return function wrappedAsyncHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function wrapIfHandler(arg) {
  if (typeof arg !== 'function') return arg;
  // Express error middleware has arity 4; leave it alone.
  if (arg.length >= 4) return arg;
  // Do not wrap mounted routers/applications (they expose a layer stack).
  if (Array.isArray(arg.stack)) return arg;
  return asyncHandler(arg);
}

/**
 * Patch Express Router HTTP methods so existing async handlers are safe
 * without rewriting every route file.
 */
export function enableAsyncErrorPropagation(expressLib = express) {
  if (expressLib.__asyncErrorsPatched) return expressLib;
  expressLib.__asyncErrorsPatched = true;

  const methods = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'];
  const proto = expressLib.Router.prototype;

  for (const method of methods) {
    const original = proto[method];
    if (typeof original !== 'function') continue;
    proto[method] = function patchedProtoMethod(...args) {
      return original.apply(this, args.map(wrapIfHandler));
    };
  }

  return expressLib;
}

// Apply as soon as this module loads so route imports inherit the patch.
enableAsyncErrorPropagation(express);
