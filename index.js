import _getTheme from './getGTKTheme';

const getTheme = function() {
  return _getTheme().then(function(result) {
    document.querySelector('head > script:nth-child(5)')
    const style = document.createElement('style');
          style.id = 'theme';
          document.getElementsByTagName('head')[0].appendChild(style);
    style.innerHTML = result.raw;
    return result;
  }).catch(function(e) {
    return console.error(e.stack);
  });
}

export default getTheme;