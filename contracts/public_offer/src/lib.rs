#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
    MuxedAddress,
};

const STROOP: i128 = 10_000_000;
const BPS_DENOMINATOR: i128 = 10_000;
const DAY_IN_LEDGERS: u32 = 17_280;
const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;
const PERSISTENT_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const PERSISTENT_THRESHOLD: u32 = PERSISTENT_BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Offer,
    Sub(Address),
    Claimed(Address),
    Proceeds,
}

#[contracttype]
#[derive(Clone)]
pub struct Offer {
    pub admin: Address,
    pub usdc: Address,
    pub share: Address,
    pub price: i128,
    pub min_shares: i128,
    pub close_ledger: u32,
    pub grace_ledgers: u32,
    pub total_shares: i128,
    pub finalized: bool,
    pub allotment_bps: u32,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    OfferClosed = 3,
    OfferOpen = 4,
    BelowMinimum = 5,
    NotWholeShares = 6,
    AlreadyFinalized = 7,
    NotFinalized = 8,
    AlreadyClaimed = 9,
    InsufficientShares = 10,
    GraceNotElapsed = 11,
    NothingToClaim = 12,
    Unauthorized = 13,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SubscribeEvent {
    #[topic]
    pub subscriber: Address,
    pub shares: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FinalizeEvent {
    pub allotment_bps: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimEvent {
    #[topic]
    pub subscriber: Address,
    pub allotted: i128,
    pub refund_usdc: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RefundEvent {
    #[topic]
    pub subscriber: Address,
    pub amount: i128,
}

pub trait PublicOfferTrait {
    fn init(
        env: Env,
        admin: Address,
        usdc: Address,
        share: Address,
        price: i128,
        min_shares: i128,
        close_ledger: u32,
        grace_ledgers: u32,
    ) -> Result<(), Error>;

    fn deposit_shares(env: Env, admin: Address, amount: i128) -> Result<(), Error>;

    fn subscribe(env: Env, subscriber: Address, shares: i128) -> Result<(), Error>;

    fn finalize(env: Env, admin: Address, allotment_bps: u32) -> Result<(), Error>;

    fn claim(env: Env, subscriber: Address) -> Result<(), Error>;

    fn refund(env: Env, subscriber: Address) -> Result<(), Error>;

    fn withdraw_proceeds(env: Env, admin: Address, to: Address) -> Result<(), Error>;

    fn get_offer(env: Env) -> Result<Offer, Error>;

    fn get_subscription(env: Env, subscriber: Address) -> i128;

    fn has_claimed(env: Env, subscriber: Address) -> bool;
}

#[contract]
pub struct PublicOffer;

impl PublicOffer {
    fn load_offer(env: &Env) -> Result<Offer, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Offer)
            .ok_or(Error::NotInitialized)
    }

    fn save_offer(env: &Env, offer: &Offer) {
        env.storage().instance().set(&DataKey::Offer, offer);
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }

    fn muxed(address: &Address) -> MuxedAddress {
        MuxedAddress::from(address.clone())
    }
}

#[contractimpl]
impl PublicOfferTrait for PublicOffer {
    fn init(
        env: Env,
        admin: Address,
        usdc: Address,
        share: Address,
        price: i128,
        min_shares: i128,
        close_ledger: u32,
        grace_ledgers: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Offer) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        let offer = Offer {
            admin,
            usdc,
            share,
            price,
            min_shares,
            close_ledger,
            grace_ledgers,
            total_shares: 0,
            finalized: false,
            allotment_bps: 0,
        };
        Self::save_offer(&env, &offer);
        Ok(())
    }

    fn deposit_shares(env: Env, admin: Address, amount: i128) -> Result<(), Error> {
        let offer = Self::load_offer(&env)?;
        if admin != offer.admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();
        token::TokenClient::new(&env, &offer.share).transfer(
            &admin,
            &Self::muxed(&env.current_contract_address()),
            &amount,
        );
        Ok(())
    }

    fn subscribe(env: Env, subscriber: Address, shares: i128) -> Result<(), Error> {
        subscriber.require_auth();
        let mut offer = Self::load_offer(&env)?;

        if env.ledger().sequence() >= offer.close_ledger {
            return Err(Error::OfferClosed);
        }
        if shares < offer.min_shares {
            return Err(Error::BelowMinimum);
        }
        if shares % STROOP != 0 {
            return Err(Error::NotWholeShares);
        }

        let cost = (shares / STROOP) * offer.price;
        token::TokenClient::new(&env, &offer.usdc).transfer(
            &subscriber,
            &Self::muxed(&env.current_contract_address()),
            &cost,
        );

        let key = DataKey::Sub(subscriber.clone());
        let new_total: i128 = env
            .storage()
            .persistent()
            .update(&key, |old: Option<i128>| old.unwrap_or(0) + shares);
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
        let _ = new_total;

        offer.total_shares += shares;
        Self::save_offer(&env, &offer);

        SubscribeEvent { subscriber, shares }.publish(&env);
        Ok(())
    }

    fn finalize(env: Env, admin: Address, allotment_bps: u32) -> Result<(), Error> {
        let mut offer = Self::load_offer(&env)?;
        if admin != offer.admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();
        if offer.finalized {
            return Err(Error::AlreadyFinalized);
        }
        if env.ledger().sequence() < offer.close_ledger {
            return Err(Error::OfferOpen);
        }
        if allotment_bps as i128 > BPS_DENOMINATOR {
            return Err(Error::InsufficientShares);
        }

        let required_shares =
            (offer.total_shares * allotment_bps as i128 / BPS_DENOMINATOR) / STROOP * STROOP;
        let share_balance =
            token::TokenClient::new(&env, &offer.share).balance(&env.current_contract_address());
        if share_balance < required_shares {
            return Err(Error::InsufficientShares);
        }

        offer.finalized = true;
        offer.allotment_bps = allotment_bps;
        Self::save_offer(&env, &offer);

        FinalizeEvent { allotment_bps }.publish(&env);
        Ok(())
    }

    fn claim(env: Env, subscriber: Address) -> Result<(), Error> {
        let offer = Self::load_offer(&env)?;
        if !offer.finalized {
            return Err(Error::NotFinalized);
        }
        let claimed_key = DataKey::Claimed(subscriber.clone());
        if env.storage().persistent().has(&claimed_key) {
            return Err(Error::AlreadyClaimed);
        }
        let sub_key = DataKey::Sub(subscriber.clone());
        let subscribed: i128 = env.storage().persistent().get(&sub_key).unwrap_or(0);
        if subscribed == 0 {
            return Err(Error::NothingToClaim);
        }

        let allotted = (subscribed * offer.allotment_bps as i128 / BPS_DENOMINATOR) / STROOP
            * STROOP;
        let refund_shares = subscribed - allotted;
        let refund_usdc = (refund_shares / STROOP) * offer.price;
        let proceeds = (allotted / STROOP) * offer.price;

        env.storage().persistent().set(&claimed_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&claimed_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP_AMOUNT);

        if proceeds > 0 {
            env.storage().persistent().update(&DataKey::Proceeds, |old: Option<i128>| {
                old.unwrap_or(0) + proceeds
            });
            env.storage().persistent().extend_ttl(
                &DataKey::Proceeds,
                PERSISTENT_THRESHOLD,
                PERSISTENT_BUMP_AMOUNT,
            );
        }

        if allotted > 0 {
            token::TokenClient::new(&env, &offer.share).transfer(
                &env.current_contract_address(),
                &Self::muxed(&subscriber),
                &allotted,
            );
        }
        if refund_usdc > 0 {
            token::TokenClient::new(&env, &offer.usdc).transfer(
                &env.current_contract_address(),
                &Self::muxed(&subscriber),
                &refund_usdc,
            );
        }

        ClaimEvent {
            subscriber,
            allotted,
            refund_usdc,
        }
        .publish(&env);
        Ok(())
    }

    fn refund(env: Env, subscriber: Address) -> Result<(), Error> {
        let offer = Self::load_offer(&env)?;
        if offer.finalized {
            return Err(Error::AlreadyFinalized);
        }
        if env.ledger().sequence() < offer.close_ledger + offer.grace_ledgers {
            return Err(Error::GraceNotElapsed);
        }
        let claimed_key = DataKey::Claimed(subscriber.clone());
        if env.storage().persistent().has(&claimed_key) {
            return Err(Error::AlreadyClaimed);
        }
        let sub_key = DataKey::Sub(subscriber.clone());
        let subscribed: i128 = env.storage().persistent().get(&sub_key).unwrap_or(0);
        if subscribed == 0 {
            return Err(Error::NothingToClaim);
        }

        let refund_usdc = (subscribed / STROOP) * offer.price;

        env.storage().persistent().set(&claimed_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&claimed_key, PERSISTENT_THRESHOLD, PERSISTENT_BUMP_AMOUNT);

        token::TokenClient::new(&env, &offer.usdc).transfer(
            &env.current_contract_address(),
            &Self::muxed(&subscriber),
            &refund_usdc,
        );

        RefundEvent {
            subscriber,
            amount: refund_usdc,
        }
        .publish(&env);
        Ok(())
    }

    fn withdraw_proceeds(env: Env, admin: Address, to: Address) -> Result<(), Error> {
        let offer = Self::load_offer(&env)?;
        if admin != offer.admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();
        if !offer.finalized {
            return Err(Error::NotFinalized);
        }

        let proceeds: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Proceeds)
            .unwrap_or(0);
        if proceeds == 0 {
            return Err(Error::NothingToClaim);
        }
        env.storage().persistent().set(&DataKey::Proceeds, &0i128);

        token::TokenClient::new(&env, &offer.usdc).transfer(
            &env.current_contract_address(),
            &Self::muxed(&to),
            &proceeds,
        );
        Ok(())
    }

    fn get_offer(env: Env) -> Result<Offer, Error> {
        Self::load_offer(&env)
    }

    fn get_subscription(env: Env, subscriber: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Sub(subscriber))
            .unwrap_or(0)
    }

    fn has_claimed(env: Env, subscriber: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Claimed(subscriber))
    }
}

#[cfg(test)]
mod test;
