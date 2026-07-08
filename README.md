# Video Speed Controller

HTML5 video and audio provides a native API to accelerate playback of any media. The problem is many players either hide or limit this functionality. For the best results, playback speed adjustments should be easy and frequent to match the pace and content being covered: we don't read at a fixed speed, and similarly, we need an easy way to accelerate the video, slow it down, and quickly rewind the last point to listen to it a few more times.

![Player](https://cloud.githubusercontent.com/assets/2400185/24076745/5723e6ae-0c41-11e7-820c-1d8e814a2888.png)

Once the extension is installed simply navigate to any page that offers HTML5 video or audio ([example](https://www.youtube.com/watch?v=E9FxNzv1Tr8)), and you'll see a speed indicator in the top left corner. Hover over the indicator to reveal the controls to accelerate, slow down, and quickly rewind or advance the media. Or, even better, simply use your keyboard:

- **S** - reset playback speed to 1.0x.
- **Z** - decrease playback speed by 0.1x.
- **C** - increase playback speed by 0.1x.
- **X** - toggle between current and preferred speed.
- **E** - rewind media by 30 seconds.
- **W** - rewind media by 120 seconds.
- **R** - advance media by 30 seconds.
- **T** - advance media by 120 seconds.
- **V** - show/hide the controller.
- **M** - set a marker at the current playback position.
- **J** - jump back to the previously set marker.

You can customize and reassign the default shortcut keys in the extension's settings page as well as add additional shortcut keys to match your preferences. As an example, you can assign multiple "preferred speed" shortcuts with different values, allowing you to quickly toggle between your most frequently used speeds. To add a new shortcut, open extension settings and click "Add New".

After making changes or adding new settings, remember to refresh the video viewing page for them to take effect.

![settings Add New shortcut](https://user-images.githubusercontent.com/121805/50726471-50242200-1172-11e9-902f-0e5958387617.jpg)

The extension also supports `<audio>` elements by default. A controller will appear for any audio player on the page, giving you the same speed controls as with video.

Unfortunately, some sites may assign other functionality to one of the shortcut keys — this is inevitable. As a workaround, the extension listens for both lower and upper case values (i.e. you can use `Shift-<shortcut>`) if there is other functionality assigned to the lowercase key. This is not a perfect solution since some sites may listen to both, but it works most of the time.

### FAQ

**The video controls are not showing up?** This extension is only compatible with HTML5 video and audio. If you don't see the controls, the media player on that page may be using a proprietary embed that does not expose a standard HTML5 `<video>` element.

**The speed controls are not showing up for local videos?** To enable playback of local media (e.g. File > Open File), you need to grant additional permissions to the extension.

- In a new tab, navigate to `chrome://extensions`
- Find "Video Speed Controller" in the list and enable "Allow access to file URLs"
- Open a new tab and try opening a local file; the controls should show up.

**The extension doesn't work on a specific site?** Some sites are excluded by default: `www.instagram.com`, `imgur.com`, `teams.microsoft.com`, and `meet.google.com`. Google Hangouts and Google Meet are also excluded at the extension manifest level. You can manage the blacklist in the extension's settings page.

### License

(MIT License) - Copyright (c) 2014 Ilya Grigorik
