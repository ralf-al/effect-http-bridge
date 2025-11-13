/**
 * @since 1.0.0
 */
import type * as HttpApi from "@effect/platform/HttpApi";
import * as HttpApiClient from "@effect/platform/HttpApiClient";
import type * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import type * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import type * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";
import type * as HttpClient from "@effect/platform/HttpClient";
import type * as HttpClientError from "@effect/platform/HttpClientError";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as ParseResult from "effect/ParseResult";
import type * as Runtime from "effect/Runtime";
import type { Mutable, NoInfer, Simplify } from "effect/Types";
import * as Result from "./Result";

/**
 * @since 1.0.0
 * @category Models
 */
export interface EffectQueryClient<
	Self,
	Id extends string,
	Groups extends HttpApiGroup.HttpApiGroup.Any,
	ApiE,
	E,
> extends Context.Tag<
		Self,
		Simplify<HttpApiClient.Client<Groups, ApiE, never>>
	> {
	new (
		_: never,
	): Context.TagClassShape<
		Id,
		Simplify<HttpApiClient.Client<Groups, ApiE, never>>
	>;

	readonly layer: Layer.Layer<Self, E>;

	readonly mutation: <
		GroupName extends HttpApiGroup.HttpApiGroup.Name<Groups>,
		Name extends HttpApiEndpoint.HttpApiEndpoint.Name<
			HttpApiGroup.HttpApiGroup.Endpoints<Group>
		>,
		Group extends
			HttpApiGroup.HttpApiGroup.Any = HttpApiGroup.HttpApiGroup.WithName<
			Groups,
			GroupName
		>,
		Endpoint extends
			HttpApiEndpoint.HttpApiEndpoint.Any = HttpApiEndpoint.HttpApiEndpoint.WithName<
			HttpApiGroup.HttpApiGroup.Endpoints<Group>,
			Name
		>,
	>(
		group: GroupName,
		endpoint: Name,
	) => [Endpoint] extends [
		HttpApiEndpoint.HttpApiEndpoint<
			infer _Name,
			infer _Method,
			infer _Path,
			infer _UrlParams,
			infer _Payload,
			infer _Headers,
			infer _Success,
			infer _Error,
			infer _R,
			infer _RE
		>,
	]
		? (
				request: Simplify<
					HttpApiEndpoint.HttpApiEndpoint.ClientRequest<
						_Path,
						_UrlParams,
						_Payload,
						_Headers,
						false
					>
				>,
			) => Promise<
				Result.Result<
					_Success,
					| _Error
					| HttpApiGroup.HttpApiGroup.Error<Group>
					| E
					| HttpClientError.HttpClientError
					| ParseResult.ParseError
				>
			>
		: never;

	readonly query: <
		GroupName extends HttpApiGroup.HttpApiGroup.Name<Groups>,
		Name extends HttpApiEndpoint.HttpApiEndpoint.Name<
			HttpApiGroup.HttpApiGroup.Endpoints<Group>
		>,
		Group extends
			HttpApiGroup.HttpApiGroup.Any = HttpApiGroup.HttpApiGroup.WithName<
			Groups,
			GroupName
		>,
		Endpoint extends
			HttpApiEndpoint.HttpApiEndpoint.Any = HttpApiEndpoint.HttpApiEndpoint.WithName<
			HttpApiGroup.HttpApiGroup.Endpoints<Group>,
			Name
		>,
	>(
		group: GroupName,
		endpoint: Name,
		request: [Endpoint] extends [
			HttpApiEndpoint.HttpApiEndpoint<
				infer _Name,
				infer _Method,
				infer _Path,
				infer _UrlParams,
				infer _Payload,
				infer _Headers,
				infer _Success,
				infer _Error,
				infer _R,
				infer _RE
			>,
		]
			? Simplify<
					HttpApiEndpoint.HttpApiEndpoint.ClientRequest<
						_Path,
						_UrlParams,
						_Payload,
						_Headers,
						false
					>
				>
			: never,
	) => Promise<
		Result.Result<
			[Endpoint] extends [
				HttpApiEndpoint.HttpApiEndpoint<
					infer _Name,
					infer _Method,
					infer _Path,
					infer _UrlParams,
					infer _Payload,
					infer _Headers,
					infer _Success,
					infer _Error,
					infer _R,
					infer _RE
				>,
			]
				? _Success
				: never,
			| ([Endpoint] extends [
					HttpApiEndpoint.HttpApiEndpoint<
						infer _Name,
						infer _Method,
						infer _Path,
						infer _UrlParams,
						infer _Payload,
						infer _Headers,
						infer _Success,
						infer _Error,
						infer _R,
						infer _RE
					>,
			  ]
					? _Error
					: never)
			| ([Endpoint] extends [
					HttpApiEndpoint.HttpApiEndpoint<
						infer _Name,
						infer _Method,
						infer _Path,
						infer _UrlParams,
						infer _Payload,
						infer _Headers,
						infer _Success,
						infer _Error,
						infer _R,
						infer _RE
					>,
			  ]
					? HttpApiGroup.HttpApiGroup.Error<
							HttpApiGroup.HttpApiGroup.WithName<Groups, GroupName>
						>
					: never)
			| E
			| HttpClientError.HttpClientError
			| ParseResult.ParseError
		>
	>;
}

declare global {
	interface ErrorConstructor {
		stackTraceLimit: number;
	}
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const Tag =
	<Self>() =>
	<
		const Id extends string,
		ApiId extends string,
		Groups extends HttpApiGroup.HttpApiGroup.Any,
		ApiE,
		E,
		R,
	>(
		id: Id,
		options: {
			readonly api: HttpApi.HttpApi<ApiId, Groups, ApiE, R>;
			readonly httpClient: Layer.Layer<
				| HttpApiMiddleware.HttpApiMiddleware.Without<
						| NoInfer<R>
						| HttpApiGroup.HttpApiGroup.ClientContext<NoInfer<Groups>>
				  >
				| HttpClient.HttpClient,
				E
			>;
			readonly transformClient?:
				| ((client: HttpClient.HttpClient) => HttpClient.HttpClient)
				| undefined;
			readonly transformResponse?:
				| ((
						effect: Effect.Effect<unknown, unknown>,
				  ) => Effect.Effect<unknown, unknown>)
				| undefined;
			readonly baseUrl?: URL | string | undefined;
		},
	): EffectQueryClient<Self, Id, Groups, ApiE, E> => {
		const self: Mutable<EffectQueryClient<Self, Id, Groups, ApiE, E>> =
			Context.Tag(id)<Self, HttpApiClient.Client<Groups, E, R>>() as any;

		self.layer = Layer.scoped(
			self,
			HttpApiClient.make(options.api, options),
		).pipe(Layer.provide(options.httpClient)) as Layer.Layer<Self, E>;

		let runtimePromise: Promise<Runtime.Runtime<Self>> | undefined;
		const getRuntime = () => {
			if (!runtimePromise) {
				runtimePromise = Layer.toRuntime(self.layer).pipe(
					Effect.scoped,
					Effect.runPromise,
				);
			}
			return runtimePromise;
		};

		self.mutation = ((group: string, endpoint: string) => {
			return async (request: unknown) => {
				const runtime = await getRuntime();
				const effect = Effect.gen(function* () {
					const client = (yield* self) as Record<
						string,
						Record<string, (req: unknown) => Effect.Effect<unknown>>
					>;
					const groupHandlers = client[group];
					if (!groupHandlers) {
						throw new Error(`Group "${group}" not found`);
					}
					const endpointHandler = groupHandlers[endpoint];
					if (!endpointHandler) {
						throw new Error(
							`Endpoint "${endpoint}" not found in group "${group}"`,
						);
					}
					return yield* endpointHandler(request);
				});

				const exit = await Effect.runPromiseExit(
					effect.pipe(Effect.provide(runtime)),
				);

				return Result.fromExit(exit);
			};
		}) as any;

		self.query = (async (
			group: string,
			endpoint: string,
			request: {
				readonly path?: unknown;
				readonly urlParams?: unknown;
				readonly payload?: unknown;
				readonly headers?: unknown;
			},
		) => {
			const runtime = await getRuntime();
			const effect = Effect.gen(function* () {
				const client = (yield* self) as Record<
					string,
					Record<string, (req: unknown) => Effect.Effect<unknown>>
				>;
				const groupHandlers = client[group];
				if (!groupHandlers) {
					throw new Error(`Group "${group}" not found`);
				}
				const endpointHandler = groupHandlers[endpoint];
				if (!endpointHandler) {
					throw new Error(
						`Endpoint "${endpoint}" not found in group "${group}"`,
					);
				}
				return yield* endpointHandler(request);
			});

			const exit = await Effect.runPromiseExit(
				effect.pipe(Effect.provide(runtime)),
			);

			return Result.fromExit(exit);
		}) as any;

		return self as EffectQueryClient<Self, Id, Groups, ApiE, E>;
	};
