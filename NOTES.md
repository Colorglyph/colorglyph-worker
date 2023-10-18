* Currently using a custom build of the `soroban-client`
* And a custom build off the `main` branch of `stellar-base`
    * This requires manually installing and building in the `nodes_modules/stellar-base` before running the app

* Saving errors should maybe happen in queues?
    * Since we're appending it could require quite a bit of reading and writing

* Consider hooking up Sentry for error logging