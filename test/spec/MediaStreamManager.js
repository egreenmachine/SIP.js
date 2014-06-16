describe('MediaStreamManager', function() {
  var mediaStreamManager;
  var MediaStreamManager = SIP.WebRTC.MediaStreamManager;

  beforeEach(function () {
    mediaStreamManager = new MediaStreamManager();
  });

  it('initializes its events', function () {
    expect(mediaStreamManager.checkEvent('userMediaRequest')).toEqual(true);
    expect(mediaStreamManager.checkEvent('userMedia')).toEqual(true);
    expect(mediaStreamManager.checkEvent('userMediaFailed')).toEqual(true);
  });

  describe('.acquire', function () {
    it('passes its constraints to SIP.WebRTC.getUserMedia', function () {
      spyOn(SIP.WebRTC, 'getUserMedia');
      var onSuccess = function yay () {};
      var onFailure = function boo () {};
      var constraints = {audio: false, video: true};
      mediaStreamManager.acquire(onSuccess, onFailure, constraints);
      expect(SIP.WebRTC.getUserMedia.mostRecentCall.args[0]).toEqual(constraints);
    });

    it('emits userMediaRequest before calling getUserMedia', function () {
      spyOn(SIP.WebRTC, 'getUserMedia');
      var onUMR = jasmine.createSpy().andCallFake(function () {
        expect(SIP.WebRTC.getUserMedia).not.toHaveBeenCalled();
      });
      mediaStreamManager.on('userMediaRequest', onUMR);

      mediaStreamManager.acquire(new Function(), new Function(), {
        audio: true,
        video: true
      });

      expect(onUMR).toHaveBeenCalled();
      expect(SIP.WebRTC.getUserMedia).toHaveBeenCalled();
    });

    it('emits userMedia when getUserMedia calls a success callback', function () {
      var myStream = { foo: 'bar' };
      spyOn(SIP.WebRTC, 'getUserMedia').andCallFake(function (c, s, f) {
        s(myStream);
      });

      var success = jasmine.createSpy('success');
      var failure = jasmine.createSpy('failure');
      var onUM = jasmine.createSpy().andCallFake(function () {
        expect(stream).toEqual(myStream);
      });

      mediaStreamManager.on('userMedia', onUM);

      mediaStreamManager.acquire(success, failure, {
        audio: true,
        video: true
      });

      expect(onUM).toHaveBeenCalled();
      expect(success).toHaveBeenCalled();
      expect(failure).not.toHaveBeenCalled();
    });

    it('emits userMediaFailed when getUserMedia calls a failure callback', function () {
      spyOn(SIP.WebRTC, 'getUserMedia').andCallFake(function (c, s, f) {
        f();
      });

      var success = jasmine.createSpy('success');
      var failure = jasmine.createSpy('failure');
      var onUMF = jasmine.createSpy();

      mediaStreamManager.on('userMediaFailed', onUMF);

      mediaStreamManager.acquire(success, failure, {
        audio: true,
        video: true
      });

      expect(onUMF).toHaveBeenCalled();
      expect(success).not.toHaveBeenCalled();
      expect(failure).toHaveBeenCalled();
    });

  });

  describe('.release', function () {
    it('calls stop() on the MediaStream it was passed', function () {
      var stream = {
        stop: function () {}
      };
      spyOn(stream, 'stop');
      mediaStreamManager.release(stream);
      expect(stream.stop).toHaveBeenCalled();
    });
  });

  describe('.ofStream called with {}', function () {
    var stream;
    var managerOfStream;
    var onSuccess;
    var onFailure;

    beforeEach(function () {
      stream = jasmine.createSpyObj('stream', ['stop']);
      managerOfStream = new MediaStreamManager.ofStream(stream);
      onSuccess = jasmine.createSpy('onSuccess');
      onFailure = jasmine.createSpy('onFailure');
    });

    it('is a MediaStreamManager', function () {
      expect(managerOfStream instanceof MediaStreamManager).toBe(true);
    });

    it('.acquire ignores constraints and succeeds with the stream', function () {
      var constraints = {doesnt: 'matter'};
      managerOfStream.acquire(onSuccess, onFailure, constraints);
      expect(onSuccess).toHaveBeenCalledWith(stream);
    });

    it('.acquire called twice in a row does not fail', function () {
      managerOfStream.acquire(onSuccess, onFailure);
      managerOfStream.acquire(onSuccess, onFailure);
      expect(onFailure).not.toHaveBeenCalled();
    });

    it('.release does not stop the stream', function () {
      managerOfStream.acquire(onSuccess, onFailure);
      managerOfStream.release(stream);
      expect(stream.stop).not.toHaveBeenCalled();
    });

    it('second .acquire succeeds if called after .release was called with the stream', function () {
      managerOfStream.acquire(onSuccess, onFailure);
      managerOfStream.release(stream);
      managerOfStream.acquire(onSuccess, onFailure);

      expect(onSuccess.callCount).toBe(2);
      expect(onFailure.callCount).toBe(0);
    });

    it('second .acquire fails if called after .release was called with not-the-stream', function () {
      managerOfStream.acquire(onSuccess, onFailure);
      spyOn(console, 'error'); // suppress expected error message
      managerOfStream.release({});
      managerOfStream.acquire(onSuccess, onFailure);

      expect(onSuccess.callCount).toBe(2);
      expect(onFailure.callCount).toBe(0);
    });
  });

  describe('.cast', function () {
    it('when called with a falsy argument, returns a (default) MediaStreamManager', function () {
      expect(MediaStreamManager.cast() instanceof MediaStreamManager).toBe(true);
    });

    it('when called with a MediaStreamManager, returns it', function () {
      var manager = new MediaStreamManager();
      expect(MediaStreamManager.cast(manager)).toBe(manager);
    });

    it('when called with a MediaStream, returns a MediaStreamManager.ofStream', function () {
      SIP.WebRTC.MediaStream = function () {};
      spyOn(SIP.WebRTC, 'MediaStream');
      var stream = new SIP.WebRTC.MediaStream();
      var manager = MediaStreamManager.cast(stream);
      expect(manager instanceof MediaStreamManager.ofStream).toBe(true);
    });

    it('when called with anything else, returns a MediaStreamManager', function () {
      var constraints = {asdf: 'asdf'};
      var manager = MediaStreamManager.cast(constraints);
      expect(manager instanceof MediaStreamManager).toBe(true);
    });
  });
});
