import fs from 'fs';
import path from 'path';

export const each = (obj, cb) => {
  if (Array.isArray(obj)) {
    for (let i = 0, len = obj.length; i < len; i++) {
      let returnValue = cb(obj[i], i);
      if (returnValue === false) {
        return;
      } else if (returnValue === null) {
        break;
      } else if (returnValue === true) {
        continue;
      }
    }
  } else if (typeof obj === 'object') {
    let keys = Object.keys(obj);
    for (let i = 0, len = keys.length; i < len; i++) {
      cb(obj[keys[i]], keys[i]);
    }
  }
};

export const findIndex = function(arr, cb) {
  for (let i = 0, len = arr.length; i < len; i++) {
    if (cb(arr[i], i, arr)) {
      return i;
    }
  }
  return -1;
}

export const find = function(arr, cb) {
  for (let i = 0, len = arr.length; i < len; i++) {
    if (cb(arr[i], i, arr)) {
      return arr[i];
    }
  }
  return null;
}

export const filter = function (arr, cb) {
  let result = [];
  for (let i = 0, len = arr.length; i < len; i++) {
    if (cb(arr[i], i, arr)) {
      result.push(arr[i]);
    }
  }
  return result;
};

export const map = function (arr, fn) {
  if (arr == null) {
    return [];
  }

  let len = arr.length;
  let out = Array(len);

  for (let i = 0; i < len; i++) {
    out[i] = fn(arr[i], i, arr);
  }

  return out;
}

export const walk = (dir, done)=>{
  let results = [];
  fs.readdir(dir, (err, list)=>{
    if (err) {
      return done(err);
    }
    let pending = list.length;
    if (!pending) {
      return done(null, results);
    }
    each(list, (file)=>{
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat)=>{
        if (stat && stat.isDirectory()) {
          walk(file, (err, res)=>{
            results = results.concat(res);
            if (!--pending) {
              done(null, results);
            }
          });
        } else {
          results.push(file);
          if (!--pending) {
            done(null, results);
          }
        }
      });
    });
  });
};