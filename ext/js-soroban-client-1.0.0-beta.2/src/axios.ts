import { fetcher } from 'itty-fetcher';

/* tslint:disable-next-line:no-var-requires */
export const version = require("../package.json").version;
export const AxiosClient = fetcher({
  headers: {
    "X-Client-Name": "js-soroban-client",
    "X-Client-Version": version,
  }
});

export default AxiosClient;