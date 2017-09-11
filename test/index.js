'use strict';

const assert = require('assert');
const request = require('supertest');
const serve = require('..');
const Koa = require('koa');
const mount = require('koa-mount');

describe('serve(root)', () => {
	describe('when root = "."', () => {
		it('should serve from cwd', done => {
			const app = new Koa();

			app.use(serve('.'));

			request(app.listen()).get('/package.json').expect(200, done);
		});
	});

	describe('when path is not a file', () => {
		it('should 404', done => {
			const app = new Koa();

			app.use(serve('test/fixtures'));

			request(app.listen()).get('/something').expect(404, done);
		});
	});

	describe('when upstream middleware responds', () => {
		it('should respond', done => {
			const app = new Koa();

			app.use(serve('test/fixtures'));

			app.use(function * (next) {
				yield next;
				this.body = 'hey';
			});

			request(app.listen()).get('/hello.txt').expect(200).expect('world', done);
		});
	});

	describe('the path is valid', () => {
		it('should serve the file', done => {
			const app = new Koa();

			app.use(serve('test/fixtures'));

			request(app.listen()).get('/hello.txt').expect(200).expect('world', done);
		});
	});

	describe('.index', () => {
		describe('when present', () => {
			it('should alter the index file supported', done => {
				const app = new Koa();

				app.use(serve('test/fixtures', {index: 'index.txt'}));

				request(app.listen())
          .get('/')
          .expect(200)
          .expect('Content-Type', 'text/plain; charset=utf-8')
          .expect('text index', done);
			});
		});

		describe('when added', () => {
			it('should use index.html', done => {
				const app = new Koa();

				app.use(serve('test/fixtures', {index: 'index.html'}));

				request(app.listen())
          .get('/world/')
          .expect(200)
          .expect('Content-Type', 'text/html; charset=utf-8')
          .expect('html index', done);
			});
		});

		describe('by default', () => {
			it('should not use index.html', done => {
				const app = new Koa();

				app.use(serve('test/fixtures'));

				request(app.listen()).get('/world/').expect(404, done);
			});
		});
	});

	describe('when method is not `GET` or `HEAD`', () => {
		it('should 404', done => {
			const app = new Koa();

			app.use(serve('test/fixtures'));

			request(app.listen()).post('/hello.txt').expect(404, done);
		});
	});

	describe('option - format', () => {
		describe('when format: false', () => {
			it('should 404', done => {
				const app = new Koa();

				app.use(
          serve('test/fixtures', {
	index: 'index.html',
	format: false
})
        );

				request(app.listen()).get('/world').expect(404, done);
			});

			it('should 200', done => {
				const app = new Koa();

				app.use(
          serve('test/fixtures', {
	index: 'index.html',
	format: false
})
        );

				request(app.listen()).get('/world/').expect(200, done);
			});
		});

		describe('when format: true', () => {
			it('should 200', done => {
				const app = new Koa();

				app.use(
          serve('test/fixtures', {
	index: 'index.html',
	format: true
})
        );

				request(app.listen()).get('/world').expect(200, done);
			});

			it('should 200', done => {
				const app = new Koa();

				app.use(
          serve('test/fixtures', {
	index: 'index.html',
	format: true
})
        );

				request(app.listen()).get('/world/').expect(200, done);
			});
		});
	});

	describe('Support if-modified-since', () => {
		it('should 304', done => {
			const app = new Koa();

			app.use(serve('test/fixtures'));

			request(app.listen())
        .get('/world/index.html')
        .expect(200)
        .end((err, response) => {
	if (err) {
		done(err);
	}

	const lastModified = response.headers['last-modified'];

	request(app.callback())
            .get('/world/index.html')
            .set('if-modified-since', lastModified)
            .expect(304, done);
});
		});

		it('should 200', done => {
			const app = new Koa();

			app.use(serve('test/fixtures'));

			request(app.listen())
        .get('/world/index.html')
        .set('if-modified-since', 'Mon Jan 18 2011 23:04:34 GMT-0600')
        .expect(200, done);
		});
	});

	describe('Work with koa-mount', () => {
		it('should mount fine', done => {
			const app = new Koa();

			app.use(
        mount('/fixtures', serve(require('path').join(__dirname, '/fixtures')))
      );

			request(app.listen())
        .get('/fixtures/hello.txt')
        .expect(200)
        .end((err, data) => {
          // Console.log('Got response: ', err, data);
	done(err);
});
		});
	});
});

// This is more of a test of js, than of the logic. But something we rely on
describe('Dates should truncate not, round', () => {
	it('should mount fine', () => {
		const str = new Date().toUTCString();

		let ms = Date.parse(str);
		ms += 999; // Add 999 ms

		const nd = new Date(ms);

		assert(nd.toUTCString() === str);
	});
});
