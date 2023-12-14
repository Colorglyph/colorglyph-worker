* Currently using a custom build of the `soroban-client`
* And a custom build off the `main` branch of `stellar-base`
    * This requires manually installing and building in the `nodes_modules/stellar-base` before running the app

* Saving errors should maybe happen in queues?
    * Since we're appending it could require quite a bit of reading and writing

* Consider hooking up Sentry for error logging

* Queue retries send the message to the front, which is a problem for tx-get if the NOT_FOUND is unlikely to ever find. We're just in a pointless waiting game for 60 seconds (5 seconds * 12 retries)

* I'm still not confident we aren't losing channel accounts. A) let's check that logic and B) let's save all channel accounts to a KV that periodically merges back the the ocean account