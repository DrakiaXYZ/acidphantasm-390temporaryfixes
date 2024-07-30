import { BotLevelGenerator } from "@spt/generators/BotLevelGenerator";
import type { MinMax } from "@spt/models/common/MinMax";
import type { IRandomisedBotLevelResult } from "@spt/models/eft/bot/IRandomisedBotLevelResult";
import type { IBotBase } from "@spt/models/eft/common/tables/IBotBase";
import type { BotGenerationDetails } from "@spt/models/spt/bots/BotGenerationDetails";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { DatabaseService } from "@spt/services/DatabaseService";
import type { MathUtil } from "@spt/utils/MathUtil";
import type { RandomUtil } from "@spt/utils/RandomUtil";
import { inject, injectable } from "tsyringe";

/** Fix bot level generation */
@injectable()
export class MyCustomBotLevelGenerator extends BotLevelGenerator
{
    constructor(
        @inject("PrimaryLogger") protected logger: ILogger,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("DatabaseService") protected databaseService: DatabaseService,
        @inject("MathUtil") protected mathUtil: MathUtil,
    ) {
        super(logger, randomUtil, databaseService, mathUtil);
    }

    /**
     * Return a randomised bot level and exp value
     * @param levelDetails Min and max of level for bot
     * @param botGenerationDetails Details to help generate a bot
     * @param bot Bot the level is being generated for
     * @returns IRandomisedBotLevelResult object
     */
    public generateBotLevel(
        levelDetails: MinMax,
        botGenerationDetails: BotGenerationDetails,
        bot: IBotBase,
    ): IRandomisedBotLevelResult {
        const expTable = this.databaseService.getGlobals().config.exp.level.exp_table;
        const botLevelRange = this.getRelativeBotLevelRange(botGenerationDetails, levelDetails, expTable.length);

        // Get random level based on the exp table.
        let exp = 0;
        const level = this.chooseBotLevel(botLevelRange.min, botLevelRange.max, 1, 1.15);

        for (let i = 0; i < level; i++) {
            exp += expTable[i].exp;
        }

        // Sprinkle in some random exp within the level, unless we are at max level.
        if (level < expTable.length - 1) {
            exp += this.randomUtil.getInt(0, expTable[level].exp - 1);
        }

        return { level, exp };
    }

    /**
     * Return the min and max bot level based on a relative delta from the PMC level
     * @param botGenerationDetails Details to help generate a bot
     * @param levelDetails
     * @param maxlevel Max level allowed
     * @returns A MinMax of the lowest and highest level to generate the bots
     */
    protected getRelativeBotLevelRange(
        botGenerationDetails: BotGenerationDetails,
        levelDetails: MinMax,
        maxAvailableLevel: number,
    ): MinMax {
        const minPossibleLevel =
            botGenerationDetails.isPmc && botGenerationDetails.locationSpecificPmcLevelOverride
                ? Math.min(
                    Math.max(levelDetails.min, botGenerationDetails.locationSpecificPmcLevelOverride.min), // Biggest between json min and the botgen min
                    maxAvailableLevel, // Fallback if value above is crazy (default is 79)
                )
                : Math.min(levelDetails.min, maxAvailableLevel); // Not pmc with override or non-pmc

        const maxPossibleLevel =
            botGenerationDetails.isPmc && botGenerationDetails.locationSpecificPmcLevelOverride
                ? Math.min(botGenerationDetails.locationSpecificPmcLevelOverride.max, maxAvailableLevel) // Was a PMC and they have a level override
                : Math.min(levelDetails.max, maxAvailableLevel); // Not pmc with override or non-pmc

        let minLevel = botGenerationDetails.playerLevel - botGenerationDetails.botRelativeLevelDeltaMin;
        let maxLevel = botGenerationDetails.playerLevel + botGenerationDetails.botRelativeLevelDeltaMax;

        // Bound the level to the min/max possible
        maxLevel = Math.min(Math.max(maxLevel, minPossibleLevel), maxPossibleLevel);
        minLevel = Math.min(Math.max(minLevel, minPossibleLevel), maxPossibleLevel);

        return {
            min: minLevel,
            max: maxLevel,
        }
    }

}