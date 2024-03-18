"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const versatus_javascript_1 = require("@versatus/versatus-javascript");
const versatus_javascript_2 = require("@versatus/versatus-javascript");
const versatus_javascript_3 = require("@versatus/versatus-javascript");
const versatus_javascript_4 = require("@versatus/versatus-javascript");
const versatus_javascript_5 = require("@versatus/versatus-javascript");
const versatus_javascript_6 = require("@versatus/versatus-javascript");
const versatus_javascript_7 = require("@versatus/versatus-javascript");
const versatus_javascript_8 = require("@versatus/versatus-javascript");
const formulae_1 = require("./lib/formulae");
class NonFungibleTokenProgram extends versatus_javascript_4.Program {
    constructor() {
        super();
        Object.assign(this.methodStrategies, {
            create: this.create.bind(this),
            catch: this.catch.bind(this),
        });
    }
    create(computeInputs) {
        try {
            const { transaction } = computeInputs;
            const { transactionInputs, from } = transaction;
            const txInputs = (0, versatus_javascript_8.validate)(JSON.parse(transactionInputs), 'unable to parse transactionInputs');
            const { totalSupply, initializedSupply, symbol, name, imgUrl, paymentProgramAddress, price, } = txInputs;
            const metadataStr = (0, versatus_javascript_8.validateAndCreateJsonString)({
                symbol,
                name,
                totalSupply,
                initializedSupply,
            });
            const addProgramMetadata = (0, versatus_javascript_2.buildProgramUpdateField)({
                field: 'metadata',
                value: metadataStr,
                action: 'extend',
            });
            const level = '1';
            const baseStats = '{"hp":39,"attack":52,"defense":43,"spAtk":60,"spDef":50,"speed":65}';
            (0, versatus_javascript_8.validate)(parseFloat(price), 'invalid price');
            const dataStr = (0, versatus_javascript_8.validateAndCreateJsonString)({
                type: 'non-fungible',
                imgUrl,
                paymentProgramAddress,
                price,
                level,
                baseStats,
            });
            const addProgramData = (0, versatus_javascript_2.buildProgramUpdateField)({
                field: 'data',
                value: dataStr,
                action: 'extend',
            });
            const programUpdateInstructions = (0, versatus_javascript_2.buildUpdateInstruction)({
                update: new versatus_javascript_6.TokenOrProgramUpdate('programUpdate', new versatus_javascript_4.ProgramUpdate(new versatus_javascript_5.AddressOrNamespace(versatus_javascript_3.THIS), [
                    addProgramMetadata,
                    addProgramData,
                ])),
            });
            const addDataToToken = (0, versatus_javascript_2.buildTokenUpdateField)({
                field: 'data',
                value: dataStr,
                action: 'extend',
            });
            const distributionInstruction = (0, versatus_javascript_2.buildTokenDistributionInstruction)({
                programId: versatus_javascript_3.THIS,
                initializedSupply,
                to: versatus_javascript_3.THIS,
                tokenUpdates: [addDataToToken],
                nonFungible: true,
            });
            const createInstruction = (0, versatus_javascript_2.buildCreateInstruction)({
                from,
                totalSupply,
                initializedSupply,
                programId: versatus_javascript_3.THIS,
                programOwner: from,
                programNamespace: versatus_javascript_3.THIS,
                distributionInstruction,
            });
            return new versatus_javascript_7.Outputs(computeInputs, [
                createInstruction,
                programUpdateInstructions,
            ]).toJson();
        }
        catch (e) {
            throw e;
        }
    }
    catch(computeInputs) {
        var _a;
        try {
            const { transaction, from } = computeInputs;
            const currProgramInfo = (0, versatus_javascript_8.validate)((_a = computeInputs.accountInfo) === null || _a === void 0 ? void 0 : _a.programs[transaction.to], 'token missing from self...');
            const tokenData = (0, versatus_javascript_8.validate)(currProgramInfo === null || currProgramInfo === void 0 ? void 0 : currProgramInfo.data, 'token missing required data to mint...');
            const price = parseInt(tokenData.price);
            const paymentProgramAddress = tokenData.paymentProgramAddress;
            const availableTokenIds = (0, versatus_javascript_8.validate)(currProgramInfo === null || currProgramInfo === void 0 ? void 0 : currProgramInfo.tokenIds, 'missing nfts to mint...');
            const tokenIds = [];
            tokenIds.push(availableTokenIds[0]);
            const amountNeededToMint = (0, versatus_javascript_8.parseAmountToBigInt)(price.toString());
            const ivs = JSON.stringify((0, formulae_1.generateIVs)());
            const evs = JSON.stringify((0, formulae_1.generateInitialEVs)());
            const dataStr = (0, versatus_javascript_8.validateAndCreateJsonString)({
                ivs,
                evs,
            });
            const updateCharmanderTokenData = (0, versatus_javascript_2.buildTokenUpdateField)({
                field: 'data',
                value: dataStr,
                action: 'extend',
            });
            const caughtCharmanderInstructions = (0, versatus_javascript_2.buildUpdateInstruction)({
                update: new versatus_javascript_6.TokenOrProgramUpdate('programUpdate', new versatus_javascript_1.TokenUpdate(new versatus_javascript_5.AddressOrNamespace(new versatus_javascript_1.Address(String(from))), new versatus_javascript_5.AddressOrNamespace(versatus_javascript_3.THIS), [updateCharmanderTokenData])),
            });
            const mintInstructions = (0, versatus_javascript_2.buildMintInstructions)({
                from: transaction.from,
                programId: transaction.programId,
                paymentTokenAddress: paymentProgramAddress,
                inputValue: amountNeededToMint,
                returnedTokenIds: tokenIds,
            });
            return new versatus_javascript_7.Outputs(computeInputs, [
                ...mintInstructions,
                caughtCharmanderInstructions,
            ]).toJson();
        }
        catch (e) {
            throw e;
        }
    }
}
const start = (input) => {
    try {
        const contract = new NonFungibleTokenProgram();
        return contract.start(input);
    }
    catch (e) {
        throw e;
    }
};
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('readable', () => {
    try {
        let chunk;
        while ((chunk = process.stdin.read()) !== null) {
            data += chunk;
        }
    }
    catch (e) {
        throw e;
    }
});
process.stdin.on('end', () => {
    try {
        const parsedData = JSON.parse(data);
        const result = start(parsedData);
        process.stdout.write(JSON.stringify(result));
    }
    catch (err) {
        // @ts-ignore
        process.stdout.write(err.message);
    }
});
