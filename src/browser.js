import { Nymph, ClassNotAvailableError, InvalidRequestError } from './Nymph';
import { InvalidResponseError } from './HttpRequester';
import { Entity, EntityIsSleepingReferenceError } from './Entity';
import { PubSub, PubSubSubscription } from './PubSub';

window.NymphClient = {
  Nymph,
  Entity,
  PubSub,
  PubSubSubscription,
  ClassNotAvailableError,
  InvalidRequestError,
  InvalidResponseError,
  EntityIsSleepingReferenceError,
};
