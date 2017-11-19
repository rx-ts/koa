import { Middleware } from 'koa'
import * as KoaRouter from 'koa-router'

export interface Route {
  handler: Middleware | Middleware[]
  method: string[]
  path: Path
}

export type Routes = Route[] & { path: string }

const routesList: Routes[] = []

export enum Method {
  ALL,
  DELETE,
  GET,
  HEAD,
  OPTIONS,
  PATCH,
  POST,
  PUT
}

const MethodMap = {
  [Method.ALL]: 'all',
  [Method.DELETE]: 'del',
  [Method.GET]: 'get',
  [Method.HEAD]: 'head',
  [Method.OPTIONS]: 'options',
  [Method.PATCH]: 'patch',
  [Method.POST]: 'post',
  [Method.PUT]: 'put'
}

export type Path = string | RegExp

export const RoutesKey = Symbol('routes')

type Router = KoaRouter & {
  [key: string]: any
}

export const injectAllRoutes = (router: KoaRouter) => {
  while (routesList.length) {
    const routes = routesList.shift()

    routes.forEach(({ handler, method, path = '' }) => {
      if (routes.path && typeof path === 'string') {
        path = routes.path + path
      }

      handler = Array.isArray(handler) ? handler : [handler]

      method.forEach(m => (router as Router)[m || MethodMap[Method.GET]](path, ...(handler as Middleware[])))
    })
  }
}

export const Controller = (target: any) => {
  routesList.push(target.prototype[RoutesKey])
}

export interface RequestMap {
  consumes?: string[]
  headers?: string[]
  method?: Method | Method[]
  path?: Path
}

function RequestMapping(requestMap: RequestMap): any
function RequestMapping(path?: Path, method?: Method | Method[]): any
function RequestMapping(path?: Path | RequestMap, method?: Method | Method[]): any {
  if (typeof path === 'string' || path instanceof RegExp) {
    path = {
      method,
      path
    }
  } else if (method !== undefined) {
    // tslint:disable-next-line no-console
    console.warn('method should not be passed in')
  }

  const requestMap: RequestMap = path || {}

  const requestMethod = requestMap.method
  const requestMethods = Array.isArray(requestMethod) ? requestMethod : [requestMethod]
  const methods = requestMethods.map(m => MethodMap[m])

  const requestPath = requestMap.path

  return (target: any, propertyKey: string, descriptor: PropertyDescriptor): void => {
    target = propertyKey ? target : target.prototype

    if (!target[RoutesKey]) {
      target[RoutesKey] = []
    }

    const routes: Routes = target[RoutesKey]

    if (propertyKey) {
      routes.push({
        handler: descriptor.value,
        method: methods,
        path: requestPath
      })
    } else {
      if (requestMethod) {
        routes.forEach(route => (route.method = route.method[0] ? route.method : methods))
      }

      routes.path = requestPath as string
    }
  }
}

export { RequestMapping }
