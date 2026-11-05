# Store Gift Box

![License](https://img.shields.io/badge/license-MIT-blue.svg) [![Latest Stable Version](https://img.shields.io/packagist/v/mattoid/flarum-ext-store-gift-box.svg)](https://packagist.org/packages/mattoid/flarum-ext-store-gift-box) [![Total Downloads](https://img.shields.io/packagist/dt/mattoid/flarum-ext-store-gift-box.svg)](https://packagist.org/packages/mattoid/flarum-ext-store-gift-box)

A [Flarum](https://flarum.org) extension. Lucky gift box goods plugin for [mattoid/flarum-ext-store](https://github.com/mattoid/flarum-ext-store): weighted random draw packs with frozen odds and a backpack opening animation.

## Features

- Define gift boxes and reward pools in the admin panel; draw odds are weight-based (weight ÷ total enabled weights) and frozen at purchase time.
- Each box can be added as a store goods (pick the exact box when adding goods), reusing the store's stock, limits, discounts and gifting logic.
- Rewards already owned by the user are automatically converted to money.
- Users open boxes from their backpack with an opening animation, and can view the full draw history.

## Installation

Install with composer:

```sh
composer require mattoid/flarum-ext-store-gift-box:"*"
```

## Updating

```sh
composer update mattoid/flarum-ext-store-gift-box:"*"
php flarum migrate
php flarum cache:clear
```

## Requirements

- Flarum 1.x
- mattoid/flarum-ext-store (the goods plugin API it builds on)

## Links

- [Packagist](https://packagist.org/packages/mattoid/flarum-ext-store-gift-box)
- [GitHub](https://github.com/mattoid/flarum-ext-store-gift-box)
