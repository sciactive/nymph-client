'use strict';

export class HttpRequester {
  static makeUrl(url, data, noSep) {
    if (!data) {
      return url;
    }
    for (let [key, value] of Object.entries(data)) {
      if (noSep) {
        url = url + (url.length ? '&' : '');
      } else {
        url = url + (url.indexOf('?') !== -1 ? '&' : '?');
      }
      url = url + encodeURIComponent(key) + '=' + encodeURIComponent(value);
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

  constructor() {
    this._xsrfToken = null;
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
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      request.open('GET', HttpRequester.makeUrl(opt.url, opt.data), true);

      request.onreadystatechange = this._onReadyStateChange(
        opt,
        resolve,
        reject
      );

      if (this._xsrfToken !== null) {
        request.setRequestHeader('X-Xsrf-Token', this._xsrfToken);
      }
      request.send();
    });
  }

  POST(opt) {
    return this._httpWriteRequest({ type: 'POST', ...opt });
  }

  PUT(opt) {
    return this._httpWriteRequest({ type: 'PUT', ...opt });
  }

  PATCH(opt) {
    return this._httpWriteRequest({ type: 'PATCH', ...opt });
  }

  DELETE(opt) {
    return this._httpWriteRequest({ type: 'DELETE', ...opt });
  }

  _httpWriteRequest(opt) {
    return new Promise((resolve, reject) => {
      let request = new XMLHttpRequest();
      request.open(opt.type, opt.url, true);

      request.onreadystatechange = this._onReadyStateChange(
        opt,
        resolve,
        reject
      );

      if (this._xsrfToken !== null) {
        request.setRequestHeader('X-Xsrf-Token', this._xsrfToken);
      }
      request.setRequestHeader(
        'Content-Type',
        'application/x-www-form-urlencoded; charset=UTF-8'
      );
      request.send(HttpRequester.makeUrl('', opt.data, true));
    });
  }

  _onReadyStateChange(opt, success, error) {
    let that = this;

    return function() {
      if (this.readyState === 4) {
        for (let i = 0; i < that.responseCallbacks.length; i++) {
          if (typeof that.responseCallbacks[i] !== 'undefined') {
            that.responseCallbacks[i](that);
          }
        }
        if (this.status >= 200 && this.status < 400) {
          const response = HttpRequester.filterPhpMessages(this.responseText);
          if (opt.dataType === 'json') {
            if (!response.length) {
              throw new InvalidResponseError('Server response was empty.');
            }
            try {
              success(JSON.parse(response));
            } catch (e) {
              if (!(e instanceof SyntaxError)) {
                throw e;
              }
              throw new InvalidResponseError('Server response was invalid.');
            }
          } else {
            success(response);
          }
        } else {
          let errObj;
          try {
            errObj = JSON.parse(
              HttpRequester.filterPhpMessages(this.responseText)
            );
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }
          if (typeof errObj !== 'object') {
            errObj = {
              textStatus: this.responseText,
            };
          }
          errObj.status = this.status;
          error(
            this.status < 500
              ? new ClientError(errObj)
              : new ServerError(errObj)
          );
        }
      }
    };
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
