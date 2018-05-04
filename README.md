# Nymph Client - collaborative app data

[![Latest Stable Version](https://img.shields.io/npm/v/nymph-client.svg)](https://www.npmjs.com/package/nymph-client) [![Open Issues](https://img.shields.io/github/issues/sciactive/nymph-client.svg)](https://github.com/sciactive/nymph-client/issues) [![License](https://img.shields.io/github/license/sciactive/nymph-client.svg)]()

Nymph is an object data store that is easy to use in JavaScript and PHP.

## Installation

### Automatic Setup

The fastest way to start building a Nymph app is with the Nymph App Template.

[Nymph App Template](https://github.com/hperrin/nymph-template)

### Manual Installation

```sh
npm install --save nymph-client
```

This repository is the JavaScript client for browsers. You can find UMD in `lib`, or ES modules in `src`. There is also a **[Node.js client](https://github.com/sciactive/nymph-client-node)**. For more information, you can see the [main Nymph repository](https://github.com/sciactive/nymph).

## Setup

```html
<head>
  <!-- PubSub setup: -->
  <script>
    NymphOptions = {
      restURL: 'https://yournymphrestserver/path/to/your/rest.php',
      pubsubURL: 'wss://yournymphpubsubserver:8080',
      rateLimit: 100
    };
  </script>
  <!-- End PubSub setup -->

  <!-- For old school JS: -->
  <script src="node_modules/nymph-client/lib/Nymph.js"></script>
  <script src="node_modules/nymph-client/lib/Entity.js"></script>
  <script src="node_modules/nymph-client/lib/PubSub.js"></script>
  <script src="node_modules/nymph-client/lib/NymphClient.js"></script>
  <script src="path/to/your/entity/js/Todo.js"></script>
  <!-- End old school JS -->
</head>
```

## Usage

```js
import {Nymph, PubSub} from 'nymph-client';
import Todo from 'Todo';

// Now you can use PubSub.
const myTodo = new Todo();
myTodo.set({
  name: 'This is a new todo!',
  done: false
});
myTodo.save().then(() => {
  let subscription = myTodo.subscribe(() => {
    // When this is called, the entity will already contain new data from the
    // publish event. If the entity is deleted, the GUID will be set to null.
    if (myTodo.guid != null) {
      alert('Somebody touched my todo!');
    } else {
      alert('Somebody deleted my todo!');
      subscription.unsubscribe();
    }
  })
});

// ...

// Make sure you start off with an empty array.
this.setState({todos: []});
let subscription = Nymph.getEntities({'class': Todo.class}, {'type': '&', '!tag': 'archived'}).subscribe((newTodos) => {
  // The first time this is called, newTodos will be an array of Todo entities.
  // After that, newTodos will be a publish event object.
  const {todos} = this.getState();
  // This takes an existing entity array and either updates it to match another
  // array, or performs actions from a publish event object to update it.
  PubSub.updateArray(todos, newTodos);
  this.setState({todos});
}, (err) => alert(err), (count) => {
  // If you provide this callback, the server will send updates of how many
  // clients are subscribed to this query.
  this.setState({userCount});
});

// ...

// Remember to clean up your subscriptions when you no longer need them.
subscription.unsubscribe();
```

For a thorough step by step guide to setting up Nymph on your own server, visit the [Setup Guide](https://github.com/sciactive/nymph/wiki/Setup-Guide).

## API Docs

Check out the [API Docs in the wiki](https://github.com/sciactive/nymph/wiki/API-Docs).
