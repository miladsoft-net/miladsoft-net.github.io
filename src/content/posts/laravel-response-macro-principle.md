---
title: "Laravel Response Macro Principle"
description: "When using Laravel to write APIs, we often need to return a JSON string or JsonResponse. There are usually two ways to do this. 1. Define a method to return a JSON response in the BaseController, and then extend that BaseController."
pubDate: "2018-04-04 05:09:16"
category: "laravel"
banner: "@images/banners/_1553621438_lPB7Pmr00g.png"
tags: ["laravel"]
oldViewCount: 2370
oldKeywords: ["Laravel,response macro,response macro"]
---

> When using `Laravel` to write APIs, we often need to return a JSON string or JsonResponse object. There are usually two ways to do this:

* Define a method to return a JSON response in the `BaseController`, and then other classes extend that `BaseController`, like:

```php
// BaseController.php

public function json($data = null, $status = 200, $headers = [], $options = 0)
{
    return new JsonResponse($data, $status, $headers, $options);
}

// YourController.php
class YourController extends BaseController
{
    public function users(UserRepository $userRepository)
    {
        return $this->json($userRepository->allUser());
    }
}
```

This approach is indeed convenient and quick, and most projects probably do it this way; however, when you need to output a JSON response elsewhere (such as when middleware validation fails), you cannot reuse this method; in this case, you might directly return an error JSON response:

```php
public func handle($next, $request) {
    if ($request->user()->role_id != 1) {
        return [
            "code" => -1,
            "message" => "some error"
        ];
    }
}
```

But writing like this, when the frontend partners fix the return format or need to adjust the return format later, you have to modify all the places that might need to be changed.

## Response Macro

`Laravel` provides a very convenient `response macro` to handle this situation;

First, we need to register a response macro; in the `boot` method of any `ServiceProvider`, use the `Response Facade` to register:

```php

/**
 * Bootstrap any application services.
 *
 * @return void
 */
public function boot()
{
    Response::macro('success', function ($data = [], $message = 'success') {
        return new JsonResponse([
            'code' => 0,
            'data' => $data,
            'message' => $message
        ], 200);
    });
}
```

Next, you can use it **anywhere**;

```php
//UserController.php

public function users(UserRepository $userRepository)
{
    return response()->success($userRepository->all(), 'success');
}
```

## Principle

In the `ServiceProvider`, the author uses the `Response Facade` to register the `success` macro. Let's see what the real class of `Response` is.

```php
// Illuminate\Support\Facades.php

protected static function getFacadeAccessor()
{
    return 'Illuminate\Contracts\Routing.ResponseFactory';
}
```

This `Facade` returns a `ResponseFactory` interface, so what is the specific instance object of this interface?

```php
//Illuminate\Routing\RoutingServiceProvider.php

/**
 * Register the response factory implementation.
 *
 * @return void
 */
protected function registerResponseFactory()
{
    $this->app->singleton('Illuminate\Contracts\Routing.ResponseFactory', function ($app) {
        return new ResponseFactory($app['Illuminate\Contracts.View.Factory'], $app['redirect']);
    });
}
```

You can see that this `RoutingServiceProvider` registers an instance of `Illuminate\Routing\ResponseFactory` to the `Response Facade`.

In the source code of `Illuminate\Routing\ResponseFactory`, we can see that it uses a `Illuminate\Support\Traits.Macroable` trait.

```php
namespace Illuminate\Routing;

use Illuminate\Support\Traits\Macroable;

class ResponseFactory implements FactoryContract
{
    use Macroable;
}
```
The source code of this `Trait` is as follows, after reading the source code, you will understand why calling `response()` can normally access the `success` method.

```php
trait Macroable
{
    protected static $macros = [];

    public static function macro($name, callable $macro)
    {
        static::$macros[$name] = $macro;
    }

    public static function hasMacro($name)
    {
        return isset(static::$macros[$name]);
    }

    public static function __callStatic($method, $parameters)
    {
        if (! static::hasMacro($method)) {
            throw new BadMethodCallException("Method {$method} does not exist.");
        }
        if (static::$macros[$method] instanceof Closure) {
            return call_user_func_array(Closure::bind(static::$macros[$method], null, static::class), $parameters);
        }
        return call_user_func_array(static::$macros[$method], $parameters);
    }

    public function __call($method, $parameters)
    {
        if (! static::hasMacro($method)) {
            throw new BadMethodCallException("Method {$method} does not exist.");
        }
        if (static::$macros[$method] instanceof Closure) {
            return call_user_func_array(static::$macros[$method]->bindTo($this, static::class), $parameters);
        }
        return call_user_func_array(static::$macros[$method], $parameters);
    }
}
```

> In fact, this `trait Illuminate\Support\Traits.Macroable` is used in many places, including `FileSystem`, `Database-Builder`.

[Response-macros documentation---Laravel-China](http://d.laravel-china.org/docs/5.4/responses#response-macros)
