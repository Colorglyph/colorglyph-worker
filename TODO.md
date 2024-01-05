* Save all mined colors in a KV (maybe D1)
* Build a manual admin toolset for dealing with incomplete mints
* Improve the error saving. We likely don't need to save events other than diagnostics
* Save start and end times so we can calculate the time-to-mint delta
* Build in a mechanic for allowing the user to manage critical errors on their own
* I'm still pretty sure it's possible to lose channel accounts. These should be saved in a KV and periodically merged back into the ocean account