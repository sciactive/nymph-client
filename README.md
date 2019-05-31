# Nymph Client - collaborative app data

[![Latest Stable Version](https://img.shields.io/npm/v/nymph-client.svg)](https://www.npmjs.com/package/nymph-client) [![Open Issues](https://img.shields.io/github/issues/sciactive/nymph-client.svg)](https://github.com/sciactive/nymph-client/issues) [![License](https://img.shields.io/github/license/sciactive/nymph-client.svg)]()

Nymph is an object data store for JavaScript and PHP.

## Installation

### Automatic Setup

The fastest way to start building a Nymph app is with the [Nymph App Template](https://github.com/hperrin/nymph-template).

### Manual Installation

```sh
npm install --save nymph-client
```

This repository is the JavaScript client for browsers. You can find UMD in `dist`, or ES modules in `src`. There is also a **[Node.js client](https://github.com/sciactive/nymph-client-node)**. For more information, you can see the [main Nymph repository](https://github.com/sciactive/nymph).

## Setup

```html
<head>
  <!-- Nymph setup -->
  <script>
    NymphOptions = {
      restURL: 'https://yournymphrestserver/path/to/your/rest.php',
      pubsubURL: 'wss://yournymphpubsubserver'
    };
  </script>
  <!-- End Nymph setup -->

  <!-- Old school JS -->
  <script src="node_modules/nymph-client/dist/NymphClient.js"></script>
  <script src="path/to/your/entity/js/Todo.js"></script>
  <!-- End Old school JS -->
</head>
```

### Babel Config

When you use Babel, you can add the `@babel/plugin-transform-classes` plugin to properly extend the `Error` class. Nymph throws error classes that extend this class.

```
{
  "plugins": [
    ["@babel/transform-classes", {
      "builtins": ["Error"]
    }]
  ]
}
```

## Usage

For detailed docs, check out the wiki:

* [Entity Class](https://github.com/sciactive/nymph/wiki/Entity-Class)
* [Entity Querying](https://github.com/sciactive/nymph/wiki/Entity-Querying)
* [Extending the Entity Class](https://github.com/sciactive/nymph/wiki/Extending-the-Entity-Class)
* [Subscribing to Queries](https://github.com/sciactive/nymph/wiki/Subscribing-to-Queries)

Here's an overview:

```js
import { Nymph, PubSub } from 'nymph-client';
import Todo from 'Todo';

// Now you can use Nymph and PubSub.
const myTodo = new Todo();
myTodo.set({
  name: 'This is a new todo!',
  done: false
});
await myTodo.save();

let subscription = myTodo.subscribe(() => {
  // When this is called, the entity will already contain new data from the
  // publish event. If the entity is deleted, the GUID will be set to null.
  if (myTodo.guid != null) {
    alert('Somebody touched my todo!');
  } else {
    alert('Somebody deleted my todo!');
    subscription.unsubscribe();
  }
});

// ...

// Subscribing to a query.
let todos = [];
let userCount = 0;
let subscription = Nymph.getEntities({
  'class': Todo.class
}, {
  'type': '&',
  '!tag': 'archived'
}).subscribe(newTodos => {
  // The first time this is called, newTodos will be an array of Todo entities.
  // After that, newTodos will be a publish event object.

  // This takes an existing array of entities and either updates it to match
  // another array, or performs actions from a publish event object to update
  // it.
  PubSub.updateArray(todos, newTodos);

  // `todos` is now up to date with the latest publishes from the server.
}, err => alert(err), count => {
  // If you provide this callback, the server will send updates of how many
  // clients are subscribed to this query.
  userCount = count;
});

// ...

// Remember to clean up your subscriptions when you no longer need them.
subscription.unsubscribe();
```

For a thorough step by step guide to setting up Nymph on your own server, visit the [Setup Guide](https://github.com/sciactive/nymph/wiki/Setup-Guide).

## API Docs

Check out the [API Docs in the wiki](https://github.com/sciactive/nymph/wiki/API-Docs).
