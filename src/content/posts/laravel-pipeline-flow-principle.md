---
title: "Laravel Pipeline Flow Principle"
description: "> The principle of Laravel pipeline flow strongly relies on the array_reduce function. Let's first understand the usage of the array_reduce function.  ## array_reduce  > `array_reduce()` applies the callback function `callback` iteratively to each element of the `array`, thereby reducing the array to a single value."
pubDate: "2018-04-04 07:39:04"
category: "laravel"
banner: "@images/banners/_1553621473_pZwNEZykbY.jpeg"
tags: ["laravel"]
oldViewCount: 2960
oldKeywords: ["null"]
---

> The principle of Laravel pipeline flow strongly relies on the array_reduce function. Let's first understand the usage of the array_reduce function.

## array_reduce

> `array_reduce()` applies the callback function `callback` iteratively to each element of the `array`, thereby reducing the array to a single value.

```php
mixed array_reduce ( array $array , callable $callback [, mixed $initial = NULL ] )
```
1. array
> The input array.

2. callback
> mixed callback ( mixed $carry , mixed $item )
> `$carry` includes the value from the last iteration, if this is the first iteration, then this value is `initial`, `$item` carries the value of the current iteration.

3. initial
> If the optional parameter initial is specified, it will be used at the beginning of the process, or as the final result when the array is empty.

From the documentation, we can see that the `array_reduce` function simplifies each item of the array through the given `callback` function.

Let's see how it simplifies.

```php
$arr = ['AAAA', 'BBBB', 'CCCC'];

$res = array_reduce($arr, function($carry, $item){
    return $carry . $item;
});
```
Given the array length is **3**, so it iterates three times.
1. First iteration: $carry = null, $item = AAAA, returns AAAA
2. Second iteration: $carry = AAAA, $item = BBBB, returns AAAABBBB
3. Third iteration: $carry = AAAABBBB, $item = CCCC, returns AAAABBBBCCCC

> This way, the array is simplified to a string `AAAABBBBCCCC`.

### With Initial Value

```php
$arr = ['AAAA', 'BBBB', 'CCCC'];

$res = array_reduce($arr, function($carry, $item){
    return $carry . $item;
}, 'INITIAL-');
```
1. First iteration: $carry = INITIAL-, $item = AAAA, returns INITIAL-AAAA
2. Second iteration: $carry = INITIAL-AAAA, $item = BBBB, returns INITIAL-AAAABBBB
3. Third iteration: $carry = INITIAL-AAAABBBB, $item = CCCC, returns INITIAL-AAAABBBBCCCC

> This way, the array is simplified to a string `INITIAL-AAAABBBBCCCC`.

### Closure
```php
$arr = ['AAAA', 'BBBB', 'CCCC'];

// Without initial value
$res = array_reduce($arr, function($carry, $item){
    return function() use ($item){// Only use $item here
        return strtolower($item) . '-';
    };
});

```
1. First iteration: $carry = null, $item = AAAA, returns a closure that uses $item = AAAA
2. Second iteration: $carry = closure that uses $item = AAAA, $item = BBBB, returns a closure that uses $item = BBBB
3. Third iteration: $carry = closure that uses $item = BBBB, $item = CCCC, returns a closure that uses $item = CCCC

> This way, the array is simplified to a closure, i.e., the last returned `closure`, when we execute this closure (`$res()`), we get the return value `CCCC-`.

The above way only `use ($item)`, each iteration returns a closure, and in the next iteration, we don't use it. It just returns a closure that uses the current `item` value.

### Closure USE Closure

```php
$arr = ['AAAA'];

$res = array_reduce($arr, function($carry, $item){
    return function () use ($carry, $item) {
        if (is_null($carry)) {
            return 'Carry IS NULL' . $item;
        }
    };
});
```
> Note, the array length is **1**, and no initial value is specified.

Since the array length is 1, it iterates only once, returning a closure `use ($carry = null, $item = 'AAAA')`, when we execute this closure (`$res()`), we get the result `Carry IS NULLAAAA`.

Next, let's modify it,

```php
$arr = ['AAAA', 'BBBB'];

$res = array_reduce($arr, function($carry, $item){
    return function () use ($carry, $item) {
        if (is_null($carry)) {
            return 'Carry IS NULL' . $item;
        }
        if ($carry instanceof \Closure) {
            return $carry() . $item;
        }
    };
});
```
> We added a condition to check if the current iteration value is a closure, return the execution result of that closure.

First iteration: $carry = null, $item = AAAA, returns a closure,

```php
// Pseudo code
function () use ($carry = null, $item = AAAA) {
    if (is_null($carry)) {
        return 'Carry IS NULL' . $item;
    }
    if ($carry instanceof \Closure) {
        return $carry() . $item;
    }
}
```
If we directly execute this closure, it returns `Carry IS NULLAAAA`.

Second iteration: $carry = the closure returned from the first iteration (pseudo code), $item = BBBB, returns a closure,

> When we execute this closure, it satisfies `$carry instanceof \Closure`, and we get the result `Carry IS NULLAAAABBBB`.

## array_reverse in Laravel

After understanding the usage of `array_reverse`, let's look at its usage in Laravel pipeline flow.

In my previous article [Laravel Middleware Principle](https://laravel-china.org/articles/5180/laravel-middleware-principle), I explained that the `array_reverse` function compresses all the middleware to a single Closure through the callback method. Finally, it executes the Initial.

The core code for passing a `$request` object through global middleware in `Laravel` is as follows:
```php
//Illuminate\Foundation\Http\Kernel.php
protected function sendRequestThroughRouter($request)
{
    return (new Pipeline($this->app))
        ->send($request)
        ->through($this->app->shouldSkipMiddleware() ? [] : $this->middleware)
        ->then($this->dispatchToRouter());
}
protected function dispatchToRouter()
{
    return function ($request) {
        $this->app->instance('request', $request);
        return $this->router->dispatch($request);
    };
}
```
Just as I mentioned earlier, we send a `$request` object through the `middleware` array, and finally execute the `dispatchToRouter` method.

Assuming there are two global middleware, let's see how these two middleware are compressed into a single `Closure` through the pipeline.
```php
Illuminate\Foundation\Http\Middleware\CheckForMaintenanceMode::class,
App\Http\Middleware\AllowOrigin::class,// Custom middleware
```
> Illuminate\Pipeline\Pipeline is the core class of Laravel's pipeline flow.

In the `then` method of `Illuminate\Pipeline\Pipeline`, `$destination` is the above `dispatchToRouter` closure, `pipes` is the array of middleware to pass through, and `passable` is the `Request` object.

```php
public function then(Closure $destination)
{
    $pipeline = array_reduce(
        array_reverse($this->pipes), $this->carry(), $this->prepareDestination($destination)
    );
    return $pipeline($this->passable);
}
```
The `array_reverse` function passes each item of the middleware array through `$this->carry()`, with the initial value being the closure returned by the above `dispatchToRouter` method.

```php
protected function prepareDestination(Closure $destination)
{
    return function ($passable) use ($destination) {
        return $destination($passable);
    };
}
protected function carry()
{
    return function ($stack, $pipe) {
        return function ($passable) use ($stack, $pipe) {
            if ($pipe instanceof Closure) {
                return $pipe($passable, $stack);
            } elseif (! is_object($pipe)) {
                // Parse middleware parameters
                list($name, $parameters) = $this->parsePipeString($pipe);
                $pipe = $this->getContainer()->make($name);
                $parameters = array_merge([$passable, $stack], $parameters);
            } else {
                $parameters = [$passable, $stack];
            }
            return $pipe->{$this->method}(...$parameters);
        };
    };
}
```

First iteration: returns a closure, `use`d `$stack` and `$pipe`, `$stack` is the initial value closure, `$pipe` is the middleware class name, here it is `App\Http\Middleware\AllowOrigin::class` (note that the `array_reverse` function reverses the middleware array passed in).

Assuming we directly run this closure, since `$pipe` is a `String` type middleware class name, it only satisfies the condition `! is_object($pipe)`, we will directly `make` an instance of this middleware from the container, and execute the `handle` method of this middleware instance, passing the `request` object and the initial value as parameters to this middleware.

```php
public function handle($request, Closure $next)
{
    //......
}
```
In the `handle` method of this middleware, when we directly execute `return $next($request)`, it is equivalent to executing the initial value closure of the `array_reduce` function, which is the closure returned by the above `dispatchToRouter` method.

```php
protected function dispatchToRouter()
{
    return function ($request) {
        $this->app->instance('request', $request);
        return $this->router->dispatch($request);
    };
}
```
Okay, assuming it ends here. In the second iteration, it also returns a closure that `use`d `$stack` and `$pipe`, `$stack` is the closure returned from the first iteration, `$pipe` is the middleware class name, here it is `Illuminate\Foundation\Http\Middleware\CheckForMaintenanceMode::class`.

After two iterations, back to the `then` method, we manually execute the closure returned from the second iteration.
```php
return $pipeline($this->passable);
```
When executing the closure returned from the second iteration, the current closure `use`d `$pipe` is `Illuminate\Foundation\Http\Middleware\CheckForMaintenanceMode::class`, it also only satisfies the condition `! is_object($pipe)`, we will `make` an instance of `CheckForMaintenanceMode` middleware from the container, and execute the `handle` method of this instance, passing the closure returned from the first iteration as a parameter to the `handle` method.

When we execute `return $next($request)` in the `handle` method of `CheckForMaintenanceMode` middleware, the current `$next` is the closure returned from the first iteration, it goes back to the process we assumed earlier. `make` an instance of `App\Http\Middleware\AllowOrigin` from the container, execute the `handle` method of this instance, and pass the initial value closure to the `handle` method of `AllowOrigin` middleware. When we execute `return $next($request)` in the `handle` method of `AllowOrigin` middleware, it means all middleware have been passed, and we start executing `dispatchToRouter`.

1. Middleware is ordered, from here you should understand why the middleware array is reversed using `array_reverse`.
2. Not all middleware are instantiated before running, they are fetched from the container when needed.
3. If middleware does not execute $next($request), subsequent middleware cannot be executed.

> This article is specifically written for the previous article [Laravel Middleware Principle](https://laravel-china.org/articles/5180/laravel-middleware-principle), because when writing the Laravel Middleware Principle, I was not very clear about the `array_reduce` function's operation process in `laravel`. If there is anything wrong, feel free to point it out.
