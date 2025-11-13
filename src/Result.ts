/**
 * @since 1.0.0
 */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import * as Cause from "effect/Cause";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import type { LazyArg } from "effect/Function";
import { constTrue, dual, identity } from "effect/Function";
import * as Hash from "effect/Hash";
import * as Option from "effect/Option";
import { type Pipeable, pipeArguments } from "effect/Pipeable";
import type { Predicate, Refinement } from "effect/Predicate";
import { hasProperty, isIterable } from "effect/Predicate";
import * as Schema_ from "effect/Schema";
import type * as Types from "effect/Types";

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect-atom/atom/Result");

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId;

/**
 * @since 1.0.0
 * @category models
 */
export type Result<A, E = never> = Success<A, E> | Failure<A, E>;

/**
 * @since 1.0.0
 * @category Guards
 */
export const isResult = (u: unknown): u is Result<unknown, unknown> =>
	hasProperty(u, TypeId);

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Result {
	/**
	 * @since 1.0.0
	 * @category models
	 */
	export interface Proto<A, E> extends Pipeable {
		readonly [TypeId]: {
			readonly E: (_: never) => E;
			readonly A: (_: never) => A;
		};
	}

	/**
	 * @since 1.0.0
	 */
	export type Success<R> = R extends Result<infer A, infer _> ? A : never;

	/**
	 * @since 1.0.0
	 */
	export type Failure<R> = R extends Result<infer _, infer E> ? E : never;
}

/**
 * @since 1.0.0
 */
export type With<R extends Result<any, any>, A, E> = R extends Success<
	infer _A,
	infer _E
>
	? Success<A, E>
	: R extends Failure<infer _A, infer _E>
		? Failure<A, E>
		: never;

const ResultProto = {
	[TypeId]: {
		E: identity,
		A: identity,
	},
	pipe() {
		return pipeArguments(this, arguments);
	},
	[Equal.symbol](this: Result<any, any>, that: Result<any, any>): boolean {
		if (this._tag !== that._tag) {
			return false;
		}
		switch (this._tag) {
			case "Success":
				return Equal.equals(this.value, (that as Success<any, any>).value);
			case "Failure":
				return Equal.equals(this.cause, (that as Failure<any, any>).cause);
		}
	},
	[Hash.symbol](this: Result<any, any>): number {
		const tagHash = Hash.string(this._tag);
		return Hash.cached(
			this,
			Hash.combine(tagHash)(
				this._tag === "Success" ? Hash.hash(this.value) : Hash.hash(this.cause),
			),
		);
	},
};

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromExit = <A, E>(
	exit: Exit.Exit<A, E>,
): Success<A, E> | Failure<A, E> =>
	exit._tag === "Success" ? success(exit.value) : failure(exit.cause);

/**
 * @since 1.0.0
 * @category constructors
 * @deprecated Use fromExit instead - previousSuccess is no longer supported
 */
export const fromExitWithPrevious = <A, E>(
	exit: Exit.Exit<A, E>,
	_previous: Option.Option<Result<A, E>>,
): Success<A, E> | Failure<A, E> =>
	exit._tag === "Success" ? success(exit.value) : failure(exit.cause);

/**
 * @since 1.0.0
 * @category models
 */
export interface Success<A, E = never> extends Result.Proto<A, E> {
	readonly _tag: "Success";
	readonly value: A;
	readonly timestamp: number;
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSuccess = <A, E>(
	result: Result<A, E>,
): result is Success<A, E> => result._tag === "Success";

/**
 * @since 1.0.0
 * @category constructors
 */
export const success = <A, E = never>(
	value: A,
	options?: {
		readonly timestamp?: number | undefined;
	},
): Success<A, E> => {
	const result = Object.create(ResultProto);
	result._tag = "Success";
	result.value = value;
	result.timestamp = options?.timestamp ?? Date.now();
	return result;
};

/**
 * @since 1.0.0
 * @category models
 */
export interface Failure<A, E = never> extends Result.Proto<A, E> {
	readonly _tag: "Failure";
	readonly cause: Cause.Cause<E>;
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isFailure = <A, E>(
	result: Result<A, E>,
): result is Failure<A, E> => result._tag === "Failure";

/**
 * @since 1.0.0
 * @category refinements
 */
export const isInterrupted = <A, E>(
	result: Result<A, E>,
): result is Failure<A, E> =>
	result._tag === "Failure" && Cause.isInterruptedOnly(result.cause);

/**
 * @since 1.0.0
 * @category constructors
 */
export const failure = <E, A = never>(cause: Cause.Cause<E>): Failure<A, E> => {
	const result = Object.create(ResultProto);
	result._tag = "Failure";
	result.cause = cause;
	return result;
};

/**
 * @since 1.0.0
 * @category constructors
 */
export const fail = <E, A = never>(error: E): Failure<A, E> =>
	failure(Cause.fail(error));

/**
 * @since 1.0.0
 * @category combinators
 */
export const touch = <A extends Result<any, any>>(result: A): A => {
	if (isSuccess(result)) {
		return success(result.value) as A;
	}
	return result;
};

/**
 * @since 1.0.0
 * @category accessors
 */
export const value = <A, E>(self: Result<A, E>): Option.Option<A> => {
	if (self._tag === "Success") {
		return Option.some(self.value);
	}
	return Option.none();
};

/**
 * @since 1.0.0
 * @category accessors
 */
export const getOrElse: {
	<B>(orElse: LazyArg<B>): <A, E>(self: Result<A, E>) => A | B;
	<A, E, B>(self: Result<A, E>, orElse: LazyArg<B>): A | B;
} = dual(2, <A, E, B>(self: Result<A, E>, orElse: LazyArg<B>): A | B =>
	Option.getOrElse(value(self), orElse),
);

/**
 * @since 1.0.0
 * @category accessors
 */
export const getOrThrow = <A, E>(self: Result<A, E>): A =>
	Option.getOrThrowWith(
		value(self),
		() => new Cause.NoSuchElementException("Result.getOrThrow: no value found"),
	);

/**
 * @since 1.0.0
 * @category accessors
 */
export const cause = <A, E>(
	self: Result<A, E>,
): Option.Option<Cause.Cause<E>> =>
	self._tag === "Failure" ? Option.some(self.cause) : Option.none();

/**
 * @since 1.0.0
 * @category accessors
 */
export const error = <A, E>(self: Result<A, E>): Option.Option<E> =>
	self._tag === "Failure" ? Cause.failureOption(self.cause) : Option.none();

/**
 * @since 1.0.0
 * @category combinators
 */
export const toExit = <A, E>(
	self: Result<A, E>,
): Exit.Exit<A, E | Cause.NoSuchElementException> => {
	switch (self._tag) {
		case "Success": {
			return Exit.succeed(self.value);
		}
		case "Failure": {
			return Exit.failCause(self.cause);
		}
		default: {
			return Exit.fail(new Cause.NoSuchElementException());
		}
	}
};

/**
 * @since 1.0.0
 * @category combinators
 */
export const map: {
	<A, B>(f: (a: A) => B): <E>(self: Result<A, E>) => Result<B, E>;
	<E, A, B>(self: Result<A, E>, f: (a: A) => B): Result<B, E>;
} = dual(2, <E, A, B>(self: Result<A, E>, f: (a: A) => B): Result<B, E> => {
	switch (self._tag) {
		case "Failure":
			return failure(self.cause);
		case "Success":
			return success(f(self.value), self);
	}
});

/**
 * Pattern match on a Result.
 *
 * @since 1.0.0
 * @category combinators
 */
export const match: {
	<A, E, Y, Z>(options: {
		readonly onFailure: (_: Failure<A, E>) => Y;
		readonly onSuccess: (_: Success<A, E>) => Z;
	}): (self: Result<A, E>) => Y | Z;
	<A, E, Y, Z>(
		self: Result<A, E>,
		options: {
			readonly onFailure: (_: Failure<A, E>) => Y;
			readonly onSuccess: (_: Success<A, E>) => Z;
		},
	): Y | Z;
} = dual(
	2,
	<A, E, Y, Z>(
		self: Result<A, E>,
		options: {
			readonly onFailure: (_: Failure<A, E>) => Y;
			readonly onSuccess: (_: Success<A, E>) => Z;
		},
	): Y | Z => {
		switch (self._tag) {
			case "Failure":
				return options.onFailure(self);
			case "Success":
				return options.onSuccess(self);
		}
	},
);

/**
 * Combines multiple results into a single result. Also works with non-result
 * values.
 *
 * @since 1.0.0
 * @category combinators
 */
export const all = <const Arg extends Iterable<any> | Record<string, any>>(
	results: Arg,
): Result<
	[Arg] extends [ReadonlyArray<any>]
		? {
				-readonly [K in keyof Arg]: [Arg[K]] extends [
					Result<infer _A, infer _E>,
				]
					? _A
					: Arg[K];
			}
		: [Arg] extends [Iterable<infer _A>]
			? _A extends Result<infer _AA, infer _E>
				? _AA
				: _A
			: [Arg] extends [Record<string, any>]
				? {
						-readonly [K in keyof Arg]: [Arg[K]] extends [
							Result<infer _A, infer _E>,
						]
							? _A
							: Arg[K];
					}
				: never,
	[Arg] extends [ReadonlyArray<any>]
		? Result.Failure<Arg[number]>
		: [Arg] extends [Iterable<infer _A>]
			? Result.Failure<_A>
			: [Arg] extends [Record<string, any>]
				? Result.Failure<Arg[keyof Arg]>
				: never
> => {
	const isIter = isIterable(results);
	const entries = isIter
		? Array.from(results, (result, i) => [i, result] as const)
		: Object.entries(results);
	const successes: any = isIter ? [] : {};
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (!entry) continue;
		const [key, result] = entry;
		if (!isResult(result)) {
			successes[key] = result;
			continue;
		} else if (!isSuccess(result)) {
			return result as any;
		}
		successes[key] = result.value;
	}
	return success(successes) as any;
};

/**
 * @since 1.0.0
 * @category Builder
 */
export const builder = <A extends Result<any, any>>(
	self: A,
): Builder<
	never,
	A extends Success<infer _A, infer _E> ? _A : never,
	A extends Failure<infer _A, infer _E> ? _E : never,
	never
> => new BuilderImpl(self) as any;

/**
 * @since 1.0.0
 * @category Builder
 */
export type Builder<Out, A, E, I> = Pipeable & {
	onDefect<B>(
		f: (defect: unknown, result: Failure<A, E>) => B,
	): Builder<Out | B, A, E, I>;
	orElse<B>(orElse: LazyArg<B>): Out | B;
	orNull(): Out | null;
	render(): [A | I] extends [never] ? Out : Out | null;
} & ([A] extends [never]
		? {}
		: {
				onSuccess<B>(
					f: (value: A, result: Success<A, E>) => B,
				): Builder<Out | B, never, E, I>;
			}) &
	([E] extends [never]
		? {}
		: {
				onFailure<B>(
					f: (cause: Cause.Cause<E>, result: Failure<A, E>) => B,
				): Builder<Out | B, A, never, I>;

				onError<B>(
					f: (error: E, result: Failure<A, E>) => B,
				): Builder<Out | B, A, never, I>;

				onErrorIf<B extends E, C>(
					refinement: Refinement<E, B>,
					f: (error: B, result: Failure<A, E>) => C,
				): Builder<Out | C, A, Types.EqualsWith<E, B, E, Exclude<E, B>>, I>;
				onErrorIf<C>(
					predicate: Predicate<E>,
					f: (error: E, result: Failure<A, E>) => C,
				): Builder<Out | C, A, E, I>;

				onErrorTag<const Tags extends ReadonlyArray<Types.Tags<E>>, B>(
					tags: Tags,
					f: (
						error: Types.ExtractTag<E, Tags[number]>,
						result: Failure<A, E>,
					) => B,
				): Builder<Out | B, A, Types.ExcludeTag<E, Tags[number]>, I>;
				onErrorTag<const Tag extends Types.Tags<E>, B>(
					tag: Tag,
					f: (error: Types.ExtractTag<E, Tag>, result: Failure<A, E>) => B,
				): Builder<Out | B, A, Types.ExcludeTag<E, Tag>, I>;
			});

class BuilderImpl<Out, A, E> {
	constructor(readonly result: Result<A, E>) {}
	public output = Option.none<Out>();

	when<B extends Result<A, E>, C>(
		refinement: Refinement<Result<A, E>, B>,
		f: (result: B) => Option.Option<C>,
	): any;
	when<C>(
		refinement: Predicate<Result<A, E>>,
		f: (result: Result<A, E>) => Option.Option<C>,
	): any;
	when<C>(
		refinement: Predicate<Result<A, E>>,
		f: (result: Result<A, E>) => Option.Option<C>,
	): any {
		if (Option.isNone(this.output) && refinement(this.result)) {
			const b = f(this.result);
			if (Option.isSome(b)) {
				(this as any).output = b;
			}
		}
		return this;
	}

	pipe() {
		return pipeArguments(this, arguments);
	}

	onSuccess<B>(
		f: (value: A, result: Success<A, E>) => B,
	): BuilderImpl<Out | B, never, E> {
		return this.when(isSuccess, (r) => Option.some(f(r.value, r)));
	}

	onFailure<B>(
		f: (cause: Cause.Cause<E>, result: Failure<A, E>) => B,
	): BuilderImpl<Out | B, A, never> {
		return this.when(isFailure, (r) => Option.some(f(r.cause, r)));
	}

	onError<B>(
		f: (error: E, result: Failure<A, E>) => B,
	): BuilderImpl<Out | B, A, never> {
		return this.onErrorIf(constTrue, f) as any;
	}

	onErrorIf<C, B extends E = E>(
		refinement: Refinement<E, B> | Predicate<E>,
		f: (error: B, result: Failure<A, E>) => C,
	): BuilderImpl<Out | C, A, Types.EqualsWith<E, B, E, Exclude<E, B>>> {
		return this.when(isFailure, (result) =>
			Cause.failureOption(result.cause).pipe(
				Option.filter(refinement),
				Option.map((error) => f(error as B, result)),
			),
		);
	}

	onErrorTag<B>(
		tag: string | ReadonlyArray<string>,
		f: (error: Types.ExtractTag<E, any>, result: Failure<A, E>) => B,
	): BuilderImpl<Out | B, A, Types.ExcludeTag<E, any>> {
		return this.onErrorIf(
			(e) =>
				hasProperty(e, "_tag") &&
				(Array.isArray(tag) ? tag.includes(e._tag) : e._tag === tag),
			f,
		) as any;
	}

	onDefect<B>(
		f: (defect: unknown, result: Failure<A, E>) => B,
	): BuilderImpl<Out | B, A, E> {
		return this.when(isFailure, (result) =>
			Cause.dieOption(result.cause).pipe(
				Option.map((defect) => f(defect, result)),
			),
		);
	}

	orElse<B>(orElse: LazyArg<B>): Out | B {
		return Option.getOrElse(this.output, orElse);
	}

	orNull(): Out | null {
		return Option.getOrNull(this.output);
	}

	render(): Out | null {
		if (Option.isSome(this.output)) {
			return this.output.value;
		} else if (isFailure(this.result)) {
			throw Cause.squash(this.result.cause);
		}
		return null;
	}
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export type PartialEncoded<A, E> =
	| {
			readonly _tag: "Success";
			readonly timestamp: number;
			readonly value: A;
	  }
	| {
			readonly _tag: "Failure";
			readonly cause: Cause.Cause<E>;
	  };

/**
 * @since 1.0.0
 * @category Schemas
 */
export type Encoded<A, E> =
	| {
			readonly _tag: "Success";
			readonly timestamp: number;
			readonly value: A;
	  }
	| {
			readonly _tag: "Failure";
			readonly cause: Schema_.CauseEncoded<E, unknown>;
	  };

/**
 * @since 1.0.0
 * @category Schemas
 */
export const schemaFromSelf: Schema_.Schema<Result<any, any>> = Schema_.declare(
	isResult,
	{
		identifier: "Result",
	},
);

/**
 * @since 1.0.0
 * @category Schemas
 */
export const Schema = <
	Success extends Schema_.Schema.All = typeof Schema_.Never,
	Error extends Schema_.Schema.All = typeof Schema_.Never,
>(options: {
	readonly success?: Success | undefined;
	readonly error?: Error | undefined;
}): Schema_.transform<
	Schema_.Schema<
		PartialEncoded<Success["Type"], Error["Type"]>,
		Encoded<Success["Encoded"], Error["Encoded"]>,
		Success["Context"] | Error["Context"]
	>,
	Schema_.Schema<Result<Success["Type"], Error["Type"]>>
> => {
	const success_: Success = options.success ?? (Schema_.Never as any);
	const error: Error = options.error ?? (Schema_.Never as any);
	return Schema_.transform(
		Schema_.Union(
			Schema_.TaggedStruct("Success", {
				timestamp: Schema_.Number,
				value: success_,
			}),
			Schema_.TaggedStruct("Failure", {
				cause: Schema_.Cause({
					error,
					defect: Schema_.Defect,
				}),
			}),
		) as Schema_.Schema<
			PartialEncoded<Success["Type"], Error["Type"]>,
			Encoded<Success["Encoded"], Error["Encoded"]>,
			Success["Context"] | Error["Context"]
		>,
		schemaFromSelf,
		{
			strict: false,
			decode: (e) =>
				e._tag === "Success" ? success(e.value, e) : failure(e.cause),
			encode: identity,
		},
	) as any;
};
