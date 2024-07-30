import type { DependencyContainer } from "tsyringe";

// SPT imports
import type { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { VFS } from "@spt/utils/VFS";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import type { ICoreConfig } from "@spt/models/spt/config/ICoreConfig";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { satisfies } from "semver";

// Custom Classes
import { MyCustomBotLevelGenerator } from "./MyCustomBotLevelGenerator";

import path from "node:path";

class TemporaryFixes implements IPreSptLoadMod
{
    private static container: DependencyContainer;

    public preSptLoad(container: DependencyContainer): void
    {
        const logger = container.resolve<ILogger>("WinstonLogger");

        if (!this.validSptVersion(container)) {
            logger.error('This version of Temporary Fixes was not made for your version of SPT. Disabling');
            return;
        }

        container.register<MyCustomBotLevelGenerator>("MyCustomBotLevelGenerator", MyCustomBotLevelGenerator);
        container.register("BotLevelGenerator", { useToken: "MyCustomBotLevelGenerator" });
    }

    /**
     * Return true if the current SPT version is valid for this version of the mod
     * @param container Dependency container
     * @returns 
     */
    private validSptVersion(container: DependencyContainer): boolean
    {
        const vfs = container.resolve<VFS>("VFS");
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const sptConfig = configServer.getConfig<ICoreConfig>(ConfigTypes.CORE);
        
        const sptVersion = globalThis.G_SPTVERSION || sptConfig.sptVersion;
        const packageJsonPath: string = path.join(__dirname, "../package.json");
        const modSptVersion = JSON.parse(vfs.readFile(packageJsonPath)).sptVersion;

        return satisfies(sptVersion, modSptVersion);
    }
}

export const mod = new TemporaryFixes();
