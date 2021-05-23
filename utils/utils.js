const { toBN, toWei, fromWei, hexToAscii } = require('web3-utils');
const BN = require('bn.js');

advanceTimeAndBlock = async (time) => {
    await advanceTime(time);
    await advanceBlock();

    return Promise.resolve(web3.eth.getBlock('latest'));
}

advanceTime = (time) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [time],
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err); }
            return resolve(result);
        });
    });
}

advanceBlock = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_mine",
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err); }
            const newBlockHash = web3.eth.getBlock('latest').hash;

            return resolve(newBlockHash)
        });
    });

    
}

/**
 *  Gets the time of the last block.
 */
    currentTime = async () => {
        const { timestamp } = await web3.eth.getBlock('latest');
        return timestamp;
};

    send = payload => {
        if (!payload.jsonrpc) payload.jsonrpc = '2.0';
        if (!payload.id) payload.id = new Date().getTime();

        return new Promise((resolve, reject) => {
            web3.currentProvider.send(payload, (error, result) => {
                if (error) return reject(error);

                return resolve(result);
            });
        });
};

/**
 *  Translates an amount to our canonical unit. We happen to use 10^18, which means we can
 *  use the built in web3 method for convenience, but if unit ever changes in our contracts
 *  we should be able to update the conversion factor here.
 *  @param amount The amount you want to re-base to UNIT
 */
    toUnit = amount => toBN(toWei(amount.toString(), 'ether'));
    fromUnit = amount => fromWei(amount, 'ether');

/**
 *  Mines a single block in Ganache (evm_mine is non-standard)
 */
    mineBlock = () => send({ method: 'evm_mine' });

/**
 *  Increases the time in the EVM.
 *  @param seconds Number of seconds to increase the time by
 */
    fastForward = async seconds => {
    // It's handy to be able to be able to pass big numbers in as we can just
    // query them from the contract, then send them back. If not changed to
    // a number, this causes much larger fast forwards than expected without error.
    if (BN.isBN(seconds)) seconds = seconds.toNumber();

    // And same with strings.
    if (typeof seconds === 'string') seconds = parseFloat(seconds);

    let params = {
        method: 'evm_increaseTime',
        params: [seconds],
    };

    await send(params);

    await mineBlock();
};

/**
 *  Increases the time in the EVM to as close to a specific date as possible
 *  NOTE: Because this operation figures out the amount of seconds to jump then applies that to the EVM,
 *  sometimes the result can vary by a second or two depending on how fast or slow the local EVM is responding.
 *  @param time Date object representing the desired time at the end of the operation
 */
fastForwardTo = async time => {
    if (typeof time === 'string') time = parseInt(time);

    const timestamp = await currentTime();
    const now = new Date(timestamp * 1000);
    if (time < now)
        throw new Error(
            `Time parameter (${time}) is less than now ${now}. You can only fast forward to times in the future.`
        );

    const secondsBetween = Math.floor((time.getTime() - now.getTime()) / 1000);

    await fastForward(secondsBetween);
};

module.exports = {
    advanceTime,
    advanceBlock,
    advanceTimeAndBlock,
    currentTime,
    send,
    mineBlock,
    fastForward,
    fastForwardTo,
    toUnit,
    fromUnit,
    mineBlock

}