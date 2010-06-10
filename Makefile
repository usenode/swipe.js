
VERSION=dev
BUILD=1

dist: RPMS/noarch/swipe.js-$(VERSION)-$(BUILD).noarch.rpm

BUILD/usr/share/js:
	mkdir -p BUILD/usr/share/js

BUILD/usr/share/js/swipe/httpclient.js: BUILD/usr/share/js/swipe src/swipe/httpclient.js
	cp src/swipe/httpclient.js BUILD/usr/share/js/swipe/httpclient.js

BUILD/usr/share/js/swipe/uri.js: BUILD/usr/share/js/swipe src/swipe/uri.js
	cp src/swipe/uri.js BUILD/usr/share/js/swipe/uri.js

BUILD/usr/share/js/swipe/httpclient/node.js: BUILD/usr/share/js/swipe/httpclient src/swipe/httpclient/node.js
	cp src/swipe/httpclient/node.js BUILD/usr/share/js/swipe/httpclient/node.js

BUILD/usr/share/js/swipe:
	mkdir -p BUILD/usr/share/js/swipe

BUILD/usr/share/js/swipe/httpclient:
	mkdir -p BUILD/usr/share/js/swipe/httpclient

RPMS/noarch/swipe.js-$(VERSION)-$(BUILD).noarch.rpm: BUILD/usr/share/js/swipe/uri.js BUILD/usr/share/js/swipe/httpclient.js BUILD/usr/share/js/swipe/httpclient/node.js
	mkdir -p {BUILD,RPMS,SRPMS} && \
	rpmbuild --define '_topdir $(CURDIR)' --define 'version $(VERSION)' --define 'release $(BUILD)' -bb SPECS/swipe.js.spec

clean:
	rm -rf BUILD RPMS


