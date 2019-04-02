'use strict';

export class HttpRequester {
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
      let request = new window.XMLHttpRequest();
      request.open('GET', this._makeUrl(opt.url, opt.data), true);

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
    return this._postputdel({ type: 'POST', ...opt });
  }

  PUT(opt) {
    return this._postputdel({ type: 'PUT', ...opt });
  }

  DELETE(opt) {
    return this._postputdel({ type: 'DELETE', ...opt });
  }

  _postputdel(opt) {
    return new Promise((resolve, reject) => {
      let request = new window.XMLHttpRequest();
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
      request.send(this._makeUrl('', opt.data, true));
    });
  }

  _onReadyStateChange(opt, success, error) {
    return function() {
      if (this.readyState === 4) {
        for (let i = 0; i < this.responseCallbacks.length; i++) {
          if (typeof this.responseCallbacks[i] !== 'undefined') {
            this.responseCallbacks[i](this);
          }
        }
        if (this.status >= 200 && this.status < 400) {
          const response = this._filterPhpMessages(this.responseText);
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
            errObj = JSON.parse(this._filterPhpMessages(this.responseText));
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
          error(errObj);
        }
      }
    };
  }

  _makeUrl(url, data, noSep) {
    if (!data) {
      return url;
    }
    for (let k in data) {
      if (data.hasOwnProperty(k)) {
        if (noSep) {
          url = url + (url.length ? '&' : '');
        } else {
          url = url + (url.indexOf('?') !== -1 ? '&' : '?');
        }
        url = url + encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
      }
    }
    return url;
  }

  _filterPhpMessages(text) {
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
}

export class InvalidResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidResponseError';
  }
}

export default HttpRequester;
