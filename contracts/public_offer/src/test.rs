use crate::{Error, PublicOffer, PublicOfferClient, STROOP};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Env,
};

const PRICE: i128 = 3_900_000;
const START_LEDGER: u32 = 100;
const CLOSE_LEDGER: u32 = 150;
const GRACE_LEDGERS: u32 = 50;

struct Ctx {
    env: Env,
    client: PublicOfferClient<'static>,
    admin: soroban_sdk::Address,
    subscriber: soroban_sdk::Address,
    usdc: token::TokenClient<'static>,
    share: token::TokenClient<'static>,
}

fn min_shares() -> i128 {
    10 * STROOP
}

fn setup() -> Ctx {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(START_LEDGER);

    let admin = soroban_sdk::Address::generate(&env);
    let subscriber = soroban_sdk::Address::generate(&env);

    let usdc_sac = env.register_stellar_asset_contract_v2(admin.clone());
    let share_sac = env.register_stellar_asset_contract_v2(admin.clone());
    let usdc = token::TokenClient::new(&env, &usdc_sac.address());
    let usdc_admin = token::StellarAssetClient::new(&env, &usdc_sac.address());
    let share = token::TokenClient::new(&env, &share_sac.address());
    let share_admin = token::StellarAssetClient::new(&env, &share_sac.address());

    let contract_id = env.register(PublicOffer, ());
    let client = PublicOfferClient::new(&env, &contract_id);
    client.init(
        &admin,
        &usdc_sac.address(),
        &share_sac.address(),
        &PRICE,
        &min_shares(),
        &CLOSE_LEDGER,
        &GRACE_LEDGERS,
    );

    share_admin.mint(&admin, &(10_000 * STROOP));
    client.deposit_shares(&admin, &(10_000 * STROOP));
    usdc_admin.mint(&subscriber, &(1_000_000 * STROOP));

    Ctx {
        env,
        client,
        admin,
        subscriber,
        usdc,
        share,
    }
}

#[test]
fn init_twice_fails() {
    let ctx = setup();
    let usdc = ctx.usdc.address.clone();
    let share = ctx.share.address.clone();
    let res = ctx.client.try_init(
        &ctx.admin,
        &usdc,
        &share,
        &PRICE,
        &min_shares(),
        &CLOSE_LEDGER,
        &GRACE_LEDGERS,
    );
    assert_eq!(res, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn subscribe_below_minimum_fails() {
    let ctx = setup();
    let res = ctx
        .client
        .try_subscribe(&ctx.subscriber, &(5 * STROOP));
    assert_eq!(res, Err(Ok(Error::BelowMinimum)));
}

#[test]
fn subscribe_at_or_after_close_fails() {
    let ctx = setup();
    ctx.env.ledger().set_sequence_number(CLOSE_LEDGER);
    let res = ctx
        .client
        .try_subscribe(&ctx.subscriber, &(10 * STROOP));
    assert_eq!(res, Err(Ok(Error::OfferClosed)));
}

#[test]
fn subscribe_moves_exact_usdc() {
    let ctx = setup();
    let shares = 20 * STROOP;
    let before = ctx.usdc.balance(&ctx.subscriber);
    ctx.client.subscribe(&ctx.subscriber, &shares);
    let after = ctx.usdc.balance(&ctx.subscriber);
    let expected_cost = (shares / STROOP) * PRICE;
    assert_eq!(before - after, expected_cost);
    assert_eq!(ctx.client.get_subscription(&ctx.subscriber), shares);
}

#[test]
fn finalize_before_close_fails() {
    let ctx = setup();
    let res = ctx.client.try_finalize(&ctx.admin, &6_000);
    assert_eq!(res, Err(Ok(Error::OfferOpen)));
}

#[test]
fn finalize_and_claim_pro_rata() {
    let ctx = setup();
    let shares = 100 * STROOP;
    ctx.client.subscribe(&ctx.subscriber, &shares);

    ctx.env.ledger().set_sequence_number(CLOSE_LEDGER);
    ctx.client.finalize(&ctx.admin, &6_000);

    let usdc_before = ctx.usdc.balance(&ctx.subscriber);
    ctx.client.claim(&ctx.subscriber);

    let allotted = 60 * STROOP;
    let refund_usdc = (40 * STROOP / STROOP) * PRICE;
    assert_eq!(ctx.share.balance(&ctx.subscriber), allotted);
    assert_eq!(ctx.usdc.balance(&ctx.subscriber) - usdc_before, refund_usdc);
    assert!(ctx.client.has_claimed(&ctx.subscriber));

    let res = ctx.client.try_claim(&ctx.subscriber);
    assert_eq!(res, Err(Ok(Error::AlreadyClaimed)));
}

#[test]
fn refund_requires_grace_then_returns_full_deposit() {
    let ctx = setup();
    let shares = 30 * STROOP;
    ctx.client.subscribe(&ctx.subscriber, &shares);

    ctx.env.ledger().set_sequence_number(CLOSE_LEDGER);
    let res = ctx.client.try_refund(&ctx.subscriber);
    assert_eq!(res, Err(Ok(Error::GraceNotElapsed)));

    ctx.env
        .ledger()
        .set_sequence_number(CLOSE_LEDGER + GRACE_LEDGERS);
    let usdc_before = ctx.usdc.balance(&ctx.subscriber);
    ctx.client.refund(&ctx.subscriber);
    let expected = (shares / STROOP) * PRICE;
    assert_eq!(ctx.usdc.balance(&ctx.subscriber) - usdc_before, expected);
}

#[test]
fn withdraw_proceeds_equals_allotted_cost() {
    let ctx = setup();
    let shares = 100 * STROOP;
    ctx.client.subscribe(&ctx.subscriber, &shares);

    ctx.env.ledger().set_sequence_number(CLOSE_LEDGER);
    ctx.client.finalize(&ctx.admin, &6_000);
    ctx.client.claim(&ctx.subscriber);

    let treasury = soroban_sdk::Address::generate(&ctx.env);
    ctx.client.withdraw_proceeds(&ctx.admin, &treasury);

    let expected = 60 * PRICE;
    assert_eq!(ctx.usdc.balance(&treasury), expected);
}
