import { type OnChainIntent } from "./contracts.js";
export type JoinCircleParams = {
    contributionAmount: bigint;
    cycleDuration: bigint;
    preferredSize: number;
};
export type Intent = OnChainIntent & {
    params: JoinCircleParams;
};
export type IntentGroup = {
    intents: Intent[];
    targetContributionAmount: bigint;
    cycleDuration: bigint;
};
export declare class IntentMatcher {
    private intentRegistry;
    private circleFactory;
    /** Decode JOIN_CIRCLE intent params from bytes */
    private decodeParams;
    /** Fetch all open JOIN_CIRCLE intents from the registry */
    scanJoinIntents(): Promise<Intent[]>;
    /**
     * Group intents by compatibility:
     * - Same cycle duration (exact match)
     * - Contribution amount within ±MATCHER_CONFIG.amountTolerancePct%
     */
    groupByCompatibility(intents: Intent[]): IntentGroup[];
    /**
     * Deploy a SaveCircle via CircleFactory for a matched group,
     * then fulfill all their intents via batchFulfill.
     */
    matchAndDeploy(group: IntentGroup): Promise<string>;
    /** Main matcher tick — scan, group, deploy */
    tick(): Promise<void>;
}
