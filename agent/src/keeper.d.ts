export declare class CircleKeeper {
    /** Get all active circles from the factory */
    private getActiveCircles;
    /** Check a circle's state */
    private getCircleState;
    /**
     * Check all members for missed contributions.
     * A missed contribution is when roundStartTime + roundDuration has passed
     * and a member has not contributed in the current round.
     */
    private checkAndPenalizeMissed;
    /**
     * Check for overdue/defaulted credit lines
     * Called periodically by keeper loop
     */
    private checkCreditHealth;
    /**
     * Find and match barter intents
     * Called periodically by keeper loop
     */
    private checkBarterMatches;
    /**
     * Check if round rotation is due and advance it.
     */
    private checkAndAdvanceRound;
    /**
     * Sweep idle cUSD balance to Moola for yield.
     */
    private sweepIdleCapital;
    /**
     * Harvest yield if there's enough to be worth the gas.
     */
    private harvestYieldIfProfitable;
    /** Main keeper tick — process all active circles and credit/barter management */
    tick(): Promise<void>;
}
