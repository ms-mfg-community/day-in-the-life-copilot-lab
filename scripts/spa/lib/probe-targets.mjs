// The three deployment targets of specs/005-teaching-spa.md 2.8, served from one directory for the capability probe:
//
//   file:              the directory's page as a file: URL, as the presenter opens the portable build from disk
//   http://localhost   a plain HTTP server on the loopback, as `npm run spa:dev` or any static server is
//   https://           an HTTPS server reached by this machine's own non-loopback address, with a certificate made for the run
//
// The https target is the one that takes care. `https://localhost` would prove nothing about the scheme: localhost is
// potentially trustworthy on its own (F59, F64), so the page is reached by a LAN address, which is trustworthy only through
// https. No certificate authority is installed on the machine for this: the certificate is self-signed, made by openssl into
// the run's temporary directory, and the browser is told to trust that one key (Chromium: --ignore-certificate-errors-spki-list,
// which treats the certificate as valid rather than as an ignored error; Firefox: Playwright's ignoreHTTPSErrors). Where no
// openssl, or no non-loopback address, is available the target is not served, and the probe records its cells as not measured.
import { spawnSync } from 'node:child_process';
import { X509Certificate, createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const TARGETS = ['file:', 'http://localhost', 'https://'];

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

/** The first IPv4 address of this machine that is not loopback, or undefined when it has none. */
export function lanAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) return address.address;
    }
  }
  return undefined;
}

/** A request handler that serves the files of `dir` and nothing else. */
function serveDirectory(dir) {
  return (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(dir, `.${pathname}`);
    if (!file.startsWith(dir + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(readFileSync(file));
  };
}

const listen = (server, host) =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => resolve(server.address().port));
  });

/**
 * A self-signed certificate for `address`, written into `dir` by openssl. Returns { key, cert, spki } (PEM, PEM, and the
 * base64 SHA-256 of the public key for Chromium's --ignore-certificate-errors-spki-list), or undefined when openssl is absent.
 */
export function makeCertificate(dir, address) {
  const keyFile = path.join(dir, 'key.pem');
  const certFile = path.join(dir, 'cert.pem');
  const result = spawnSync(
    'openssl',
    ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '2', '-keyout', keyFile, '-out', certFile, '-subj', '/CN=teaching-spa-probe', '-addext', `subjectAltName=IP:${address}`],
    { encoding: 'utf8' },
  );
  if (result.error || result.status !== 0) return undefined;
  const cert = readFileSync(certFile, 'utf8');
  const spki = createHash('sha256').update(new X509Certificate(cert).publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
  return { key: readFileSync(keyFile, 'utf8'), cert, spki };
}

/**
 * Serves `dir` for the three targets. Resolves to { urls, spki, notes, close } where `urls[target]` is the probe page's URL on
 * that target (absent where the target could not be served, with the reason in `notes[target]`).
 */
export async function serveTargets(dir, page) {
  const urls = { 'file:': pathToFileURL(path.join(dir, page)).href };
  const notes = {};
  const servers = [];

  const plain = http.createServer(serveDirectory(dir));
  const plainPort = await listen(plain, '127.0.0.1');
  servers.push(plain);
  urls['http://localhost'] = `http://localhost:${plainPort}/${page}`;

  const address = lanAddress();
  let spki;
  if (address === undefined) {
    notes['https://'] = 'this machine has no non-loopback IPv4 address, so no https server could be reached by one';
  } else {
    const certificate = makeCertificate(dir, address);
    if (certificate === undefined) {
      notes['https://'] = 'openssl is not available, so no certificate could be made for the https server';
    } else {
      const secure = https.createServer({ key: certificate.key, cert: certificate.cert }, serveDirectory(dir));
      const securePort = await listen(secure, '0.0.0.0');
      servers.push(secure);
      urls['https://'] = `https://${address}:${securePort}/${page}`;
      spki = certificate.spki;
    }
  }

  return {
    urls,
    spki,
    notes,
    close: () => Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve)))),
  };
}
