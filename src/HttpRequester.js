'use strict';

export class HttpRequester {
  static makeUrl(url, data) {
    if (!data) {
      return url;
    }
    for (let [key, value] of Object.entries(data)) {
      url =
        url +
        (url.indexOf('?') !== -1 ? '&' : '?') +
        encodeURIComponent(key) +
        '=' +
        encodeURIComponent(JSON.stringify(value));
    }
    return url;
  }

  static filterPhpMessages(text) {
    const phpMessages = /<br \/>\n(<b>[\w ]+<\/b>:.*?)<br \/>\n/gm;
    if (text.match(phpMessages)) {
      let match;
      while ((match = phpMessages.exec(text)) !== null) {
        console.log('PHP Message:', match[1].replace(/<\/?b>/g, ''));
      }
      text = text.replace(phpMessages, '');
    }
    return text;
  }

  constructor(ponyFetch) {
    this.fetch = ponyFetch ? ponyFetch : (...args) => fetch(...args);
    this._xsrfToken = null;
    this.requestCallbacks = [];
    this.responseCallbacks = [];
  }

  on(event, callback) {
    if (!this.hasOwnProperty(event + 'Callbacks')) {
      return false;
    }
    this[event + 'Callbacks'].push(callback);
    return true;
  }

  off(event, callback) {
    if (!this.hasOwnProperty(event + 'Callbacks')) {
      return false;
    }
    const i = this[event + 'Callbacks'].indexOf(callback);
    if (i > -1) {
      this[event + 'Callbacks'].splice(i, 1);
    }
    return true;
  }

  setXsrfToken(xsrfToken) {
    this._xsrfToken = xsrfToken;
  }

  GET(opt) {
    return this._httpRequest('GET', opt);
  }

  POST(opt) {
    return this._httpRequest('POST', opt);
  }

  PUT(opt) {
    return this._httpRequest('PUT', opt);
  }

  PATCH(opt) {
    return this._httpRequest('PATCH', opt);
  }

  DELETE(opt) {
    return this._httpRequest('DELETE', opt);
  }

  _httpRequest(method, opt) {
    const url =
      method === 'GET' ? HttpRequester.makeUrl(opt.url, opt.data) : opt.url;
    const options = {
      method,
      headers: {},
    };

    if (method !== 'GET' && opt.data) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(opt.data);
    }

    for (let i = 0; i < this.requestCallbacks.length; i++) {
      this.requestCallbacks[i] && this.requestCallbacks[i](this, url, options);
    }

    if (this._xsrfToken !== null) {
      options.headers['X-Xsrf-Token'] = this._xsrfToken;
    }

    return this.fetch(url, options)
      .then(response => {
        if (response.ok) {
          for (let i = 0; i < this.responseCallbacks.length; i++) {
            this.responseCallbacks[i] &&
              this.responseCallbacks[i](this, response);
          }
          return response
            .text()
            .then(text => HttpRequester.filterPhpMessages(text));
        }
        return response.text().then(text => {
          let errObj;
          try {
            errObj = JSON.parse(HttpRequester.filterPhpMessages(text));
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }

          if (typeof errObj !== 'object') {
            errObj = {
              textStatus: response.statusText,
            };
          }
          errObj.status = response.status;
          throw response.status < 500
            ? new ClientError(errObj)
            : new ServerError(errObj);
        });
      })
      .then(response => {
        if (opt.dataType === 'json') {
          if (!response.length) {
            throw new InvalidResponseError('Server response was empty.');
          }
          try {
            return JSON.parse(response);
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
            throw new InvalidResponseError(
              'Server response was invalid.',
              response
            );
          }
        } else {
          return response;
        }
      });
  }
}

export class InvalidResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidResponseError';
  }
}

export class ClientError extends Error {
  constructor(errObj) {
    super(errObj.textStatus);
    this.name = 'ClientError';
    Object.assign(this, errObj);
  }
}

export class ServerError extends Error {
  constructor(errObj) {
    super(errObj.textStatus);
    this.name = 'ServerError';
    Object.assign(this, errObj);
  }
}

export default HttpRequester;
