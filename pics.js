'use strict';
/* Pictures bundled in img/<code>.svg: Fluent Emoji by Microsoft, MIT licence (img/LICENSE-fluent-emoji.txt).
   The list is shared by the page (app.js) and the service worker (sw.js).
   To add a picture: put the file in img/ and its code here, then bump CACHE in sw.js. */
const PICS = [
  '1f308', '1f31f', '1f333', '1f338', '1f339', '1f347', '1f349', '1f34b', '1f34c', '1f34e',
  '1f34f', '1f353', '1f35e', '1f370', '1f3a8', '1f3af', '1f3e0', '1f411', '1f414', '1f418',
  '1f41f', '1f422', '1f426', '1f42a', '1f42e', '1f430', '1f431', '1f434', '1f435', '1f436',
  '1f438', '1f43b', '1f440', '1f441', '1f442', '1f443', '1f445', '1f4a7', '1f537', '1f56f',
  '1f5a4', '1f681', '1f682', '1f68c', '1f691', '1f697', '1f69a', '1f69c', '1f6a2', '1f6b2',
  '1f952', '1f955', '1f95a', '1f95b', '1f981', '1f986', '1f98b', '1f993', '1f9b5', '1f9b7',
  '1f9c0', '1fac2', '2600', '2601', '2602', '26f0', '2708', '270b', '2b50',
];
