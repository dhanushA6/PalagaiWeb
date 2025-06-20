const imagesToPreload = [
  require('../images/LandingPage.jpg'),
  require('../images/playButton.gif'),
  require('../images/helper.gif'),
  require('../images/Close_Icon.png'),
  require('../images/Help_Page.jpg'),
  require('../images/PalagaiBG.png'),
  require('../images/chokeCursor.png'),
  require('../images/mike.png'),
  require('../images/moredetails.png'),
  require('../images/lessdetails.png'),
  require('../images/closeButton.png'),
  require('../images/pen.png'),
  require('../images/eraser.png'),
  require('../images/reset.png'),
  require('../images/checked.png'),
  require('../images/submit.png'),
  require('../images/hint.png'),
  require('../images/help.png'),
  require('../images/performance.png'),
  require('../images/timer.png'),
  require('../images/PalagaiBoard.jpg'),
  require('../images/guideMe.png'),
  require('../images/mute.png'),
  require('../images/unmute.png'),
  require('../images/strip.png')
];

export const preloadImages = () => {
  imagesToPreload.forEach((image) => {
    const img = new Image();
    img.src = image;
  });
}; 