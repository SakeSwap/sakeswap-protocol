const { expectRevert } = require('@openzeppelin/test-helpers');
const SakeToken = artifacts.require('SakeToken');
const SakeMaster = artifacts.require('SakeMaster');
const SakeBar = artifacts.require('SakeBar');
const SakeVoterProxy = artifacts.require('SakeVoterProxy');
const MockERC20 = artifacts.require('MockERC20');
const SakeSwapPair = artifacts.require('SakeSwapPair');
const SakeSwapFactory = artifacts.require('SakeSwapFactory');
const STokenMaster = artifacts.require('STokenMaster');
const SakeMasterV2 = artifacts.require('SakeMasterV2');

const TOTAL_SUPPLY = 10000000;
const LP_SUPPLY    = 1000000;

contract('SakeVoterProxy', ([alice, bob, carol, dev, admin, sakefee, sakeMaker, minter]) => {
    beforeEach(async () => {
        this.sakeToken = await SakeToken.new({ from: alice });
        await this.sakeToken.mint(minter, TOTAL_SUPPLY, { from: alice });
        this.SakeBar = await SakeBar.new(this.sakeToken.address,{ from: alice });
        this.sTokenMaster = await STokenMaster.new(this.sakeToken.address, bob, carol, '200', '10', '0', '300000', { from: alice });
        this.sakeMaster = await SakeMaster.new(this.sakeToken.address, dev, '1000', '0', { from: alice });
        this.sakeMasterV2 = await SakeMasterV2.new(this.sakeToken.address, admin, sakeMaker, sakefee, '0', { from: alice });
        this.sakeVoterProxy = await SakeVoterProxy.new(this.sakeToken.address, this.SakeBar.address, this.sTokenMaster.address, this.sakeMaster.address, this.sakeMasterV2.address,{ from: alice });
    });

    it('check totalSupply', async () => {
        await this.sakeToken.mint(alice, '10000', { from: alice });
        await this.sakeToken.mint(bob, '10000', { from: alice });
        await this.sakeToken.mint(carol, '10000', { from: alice });
        //sqrt(10030000)
        assert.equal((await this.sakeVoterProxy.totalSupply()).valueOf(), '3167');
        await this.sakeToken.mint(carol, '50000', { from: alice });
        //sqrt(10080000)
        assert.equal((await this.sakeVoterProxy.totalSupply()).valueOf(), '3174');
        await this.sakeToken.mint(bob, '50000', { from: alice });
        //sqrt(10130000)
        assert.equal((await this.sakeVoterProxy.totalSupply()).valueOf(), '3182');
        this.sakeVoterProxy.setSqrtEnable(false, { from: alice });
        assert.equal((await this.sakeVoterProxy.totalSupply()).valueOf(), '10130000');
        this.sakeVoterProxy.setSqrtEnable(true, { from: alice });
        assert.equal((await this.sakeVoterProxy.totalSupply()).valueOf(), '3182');
        //sakebar enter
        await this.sakeToken.approve(this.SakeBar.address, '10000', { from: carol });
        await this.SakeBar.enter('10000',{ from: carol });
        //sqrt(10140000)
        assert.equal((await this.sakeVoterProxy.totalSupply()).valueOf(), '3182');
        await this.sakeVoterProxy.setPow(2,1,0, { from: alice });
        // totalSupply = //sqrt(10130000)
        assert.equal((await this.sakeVoterProxy.totalSupply()).valueOf(), '3181');
        await this.sakeVoterProxy.setPow(2,1,2, { from: alice });
        // totalSupply = //sqrt(10150000)
        assert.equal((await this.sakeVoterProxy.totalSupply()).valueOf(), '3184');
    });

    it('check votePools api', async () => {
        await expectRevert(this.sakeVoterProxy.addV2VotePool(5,{ from: bob }),'Not Owner');
        await expectRevert(this.sakeVoterProxy.delV2VotePool(5,{ from: bob }),'Not Owner');
        for(i=50;i<100;i++)
        {
            this.sakeVoterProxy.addV2VotePool(i, { from: alice });
        }
        //console.log("get total1 ",(await this.sakeVoterProxy.totalSupply()).valueOf());
        for(i=50;i<100;i++)
        {
            this.sakeVoterProxy.delV2VotePool(i, { from: alice });
        }
        //console.log("get total2 ",(await this.sakeVoterProxy.totalSupply()).valueOf());
    });

    it('check balanceOf', async () => {
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '0');
        this.factory0 = await SakeSwapFactory.new(alice, { from: alice });
        this.factory32 = await SakeSwapFactory.new(alice, { from: alice });
        this.factory33 = await SakeSwapFactory.new(alice, { from: alice });
        this.factory34 = await SakeSwapFactory.new(alice, { from: alice });
        this.factory100 = await SakeSwapFactory.new(alice, { from: alice });
        this.factory101 = await SakeSwapFactory.new(alice, { from: alice });
        this.factory102 = await SakeSwapFactory.new(alice, { from: alice });
        this.factory103 = await SakeSwapFactory.new(alice, { from: alice });
        this.factory104 = await SakeSwapFactory.new(alice, { from: alice });
        await this.sakeToken.transferOwnership(this.sakeMaster.address, { from: alice });
        this.token0 = await MockERC20.new('TToken', 'TOKEN0', TOTAL_SUPPLY, { from: minter });
        this.lp0 = await SakeSwapPair.at((await this.factory0.createPair(this.token0.address, this.sakeToken.address)).logs[0].args.pair);
        await this.token0.transfer(this.lp0.address, LP_SUPPLY, { from: minter });
        await this.sakeToken.transfer(this.lp0.address, LP_SUPPLY, { from: minter });
        await this.lp0.mint(minter);
        await this.sakeMaster.add('10000', this.lp0.address, true);
        for(i=1;i<32;i++)
        {
            this.lptemp = await MockERC20.new('LPToken', 'TOKEN', TOTAL_SUPPLY, { from: minter });
            await this.sakeMaster.add('10000', this.lptemp.address, true);
        }
        this.token32 = await MockERC20.new('TToken', 'Token32', TOTAL_SUPPLY, { from: minter });
        this.lp32 = await SakeSwapPair.at((await this.factory32.createPair(this.token32.address, this.sakeToken.address)).logs[0].args.pair);
        await this.token32.transfer(this.lp32.address, LP_SUPPLY, { from: minter });
        await this.sakeToken.transfer(this.lp32.address, LP_SUPPLY, { from: minter });
        await this.lp32.mint(minter);
        await this.sakeMaster.add('10000', this.lp32.address, true);
        this.token33 = await MockERC20.new('TToken', 'TOKEN33', TOTAL_SUPPLY, { from: minter });
        this.lp33 = await SakeSwapPair.at((await this.factory33.createPair(this.token33.address, this.sakeToken.address)).logs[0].args.pair);
        await this.token33.transfer(this.lp33.address, LP_SUPPLY, { from: minter });
        await this.sakeToken.transfer(this.lp33.address, LP_SUPPLY, { from: minter });
        await this.lp33.mint(minter);
        await this.sakeMaster.add('10000', this.lp33.address, true);
        this.token34 = await MockERC20.new('LPToken', 'TOKEN34', TOTAL_SUPPLY, { from: minter });
        this.lp34 = await SakeSwapPair.at((await this.factory34.createPair(this.token34.address, this.sakeToken.address)).logs[0].args.pair);
        await this.token34.transfer(this.lp34.address, LP_SUPPLY, { from: minter });
        await this.sakeToken.transfer(this.lp34.address, LP_SUPPLY, { from: minter });
        await this.lp34.mint(minter);
        await this.sakeMaster.add('10000', this.lp34.address, true);
        //null pool will destroy 1000 lp_token
        // console.log("get minter lp0",(await this.lp0.balanceOf(minter)).valueOf());
        // console.log("get minter vote",(await this.sakeVoterProxy.balanceOf(minter)).valueOf());
        await this.lp0.approve(this.sakeMaster.address, '10000', { from: minter });
        await this.sakeMaster.deposit(0, '10000', { from: minter });
        //sqrt(6020000)
        //console.log("get minter balanceOf0",(await this.sakeVoterProxy.balanceOf(minter)).valueOf());
        assert.equal((await this.sakeVoterProxy.balanceOf(minter)).valueOf(), '2453');
        await this.lp32.approve(this.sakeMaster.address, '20000', { from: minter });
        await this.sakeMaster.deposit(32, '10000', { from: minter });
        //sqrt(6040000)
        //console.log("get minter balanceOf1",(await this.sakeVoterProxy.balanceOf(minter)).valueOf());
        assert.equal((await this.sakeVoterProxy.balanceOf(minter)).valueOf(), '2457');

        await this.lp0.transfer(bob, '20000', { from: minter });
        await this.lp0.approve(this.sakeMaster.address, '20000', { from: bob });
        await this.sakeMaster.deposit(0, '10000', { from: bob });
        //sqrt(20000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '141');
        await this.lp32.transfer(bob, '20000', { from: minter });
        await this.lp32.approve(this.sakeMaster.address, '20000', { from: bob });
        await this.sakeMaster.deposit(32, '20000', { from: bob });
        //sqrt(60000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '244');
        await this.lp34.transfer(bob, '20000', { from: minter });
        await this.lp34.approve(this.sakeMaster.address, '20000', { from: bob });
        await this.sakeMaster.deposit(34, '20000', { from: bob });
        //sqrt(100000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '316');
        await this.sakeMaster.withdraw(34, '10000', { from: bob });
        //sqrt(80000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '282');

        //no votepool deposit
        this.factory35 = await SakeSwapFactory.new(alice, { from: alice });
        this.token35 = await MockERC20.new('TToken', 'TOKE35', TOTAL_SUPPLY, { from: minter });
        this.lp35 = await SakeSwapPair.at((await this.factory35.createPair(this.token35.address, this.sakeToken.address)).logs[0].args.pair);
        await this.token35.transfer(this.lp35.address, LP_SUPPLY, { from: minter });
        await this.sakeToken.transfer(this.lp35.address, LP_SUPPLY, { from: minter });
        await this.lp35.mint(minter);
        await this.sakeMaster.add('10000', this.lp35.address, true);
        await this.lp35.transfer(bob, '20000', { from: minter });
        await this.lp35.approve(this.sakeMaster.address, '20000', { from: bob });
        await this.sakeMaster.deposit(35, '20000', { from: bob });
        //sqrt(80000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '282');
        // //add votepool 35
        // await this.sakeVoterProxy.addVotePool('35', { from: alice });
        // //sqrt(120000)
        // assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '346');
        // await this.sakeMaster.withdraw(35, '10000', { from: bob });
        // //sqrt(100000)
        // assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '316');
        // //del votepool 35
        // await this.sakeVoterProxy.delVotePool('35', { from: alice });
        // //sqrt(80000)
        // assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '282');

        // test xsake voter
        //bob 20000 sake , 40000 lp_sake 
        await this.sakeToken.transfer(bob, 20000, { from: minter });
        //sakebar enter
        await this.sakeToken.approve(this.SakeBar.address, '10000', { from: bob });
        await this.SakeBar.enter('10000',{ from: bob });
        ////bob 10000 sake , 40000 lp_sake , 10000 xsake
        //sqrt(100000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '316');
        
        //test setPow
        await this.sakeVoterProxy.setPow(2,1,0, { from: alice });
        // voter = sqrt(2*40000+1*10000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '300');
        await this.sakeVoterProxy.setPow(1,1,0, { from: alice });
        //voter = sqrt(1*40000+1*10000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '223');
        await this.sakeVoterProxy.setPow(1,1,2, { from: alice });
        //voter = sqrt(1*40000+1*10000+2*10000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '264');
        await this.sakeVoterProxy.setPow(2,1,1, { from: alice });

        //test stoken
        this.tokenst = await MockERC20.new('STToken', 'TOKENST', TOTAL_SUPPLY, { from: minter });
        this.lpst = await SakeSwapPair.at((await this.factory100.createPair(this.tokenst.address, this.sakeToken.address)).logs[0].args.pair);
        await this.tokenst.transfer(this.lpst.address, LP_SUPPLY, { from: minter });
        await this.sakeToken.transfer(this.lpst.address, LP_SUPPLY, { from: minter });
        await this.lpst.mint(minter);
        await this.sTokenMaster.add('100', this.lpst.address, this.sakeToken.address, false, { from: bob });
        //console.log("get bob1 voter",(await this.sakeVoterProxy.balanceOf(bob)).valueOf());
        await this.lpst.transfer(bob, '10000', { from: minter });
        await this.sakeToken.transfer(bob, 10000, { from: minter });
        await this.lpst.approve(this.sTokenMaster.address, '10000', { from: bob });
        await this.sakeToken.approve(this.sTokenMaster.address, '10000', { from: bob });
        await this.sTokenMaster.deposit(0, '10000', '10000',{ from: bob });
        //console.log("get bob2 voter",(await this.sakeVoterProxy.balanceOf(bob)).valueOf());
        //voter = sqrt(2*40000+2*10000+1*10000+1*10000)
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '346');

        //  //test add stpool
        // this.tokenst1 = await MockERC20.new('ST1Token', 'TOKENST', TOTAL_SUPPLY, { from: minter });
        // this.lpst1 = await SakeSwapPair.at((await this.factory101.createPair(this.tokenst1.address, this.sakeToken.address)).logs[0].args.pair);
        // await this.tokenst1.transfer(this.lpst1.address, LP_SUPPLY, { from: minter });
        // await this.sakeToken.transfer(this.lpst1.address, LP_SUPPLY, { from: minter });
        // await this.lpst1.mint(minter);
        // await this.sTokenMaster.add('100', this.lpst1.address, this.tokenst1.address, false, { from: bob });       
        // await this.lpst1.transfer(bob, '10000', { from: minter });
        // await this.tokenst1.transfer(bob, '10000', { from: minter });
        // await this.lpst1.approve(this.sTokenMaster.address, '10000', { from: bob });
        // await this.tokenst1.approve(this.sTokenMaster.address, '10000', { from: bob });
        // await this.sTokenMaster.deposit(1, '10000', '10000',{ from: bob });
        // //console.log("get bob3 voter",(await this.sakeVoterProxy.balanceOf(bob)).valueOf());
        // await this.sakeVoterProxy.addStlVotePool('1', { from: alice });
        // //voter = sqrt(2*40000+2*10000+2*10000+1*10000+1*10000)
        // //console.log("get bob4 voter",(await this.sakeVoterProxy.balanceOf(bob)).valueOf());
        // assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '374');
        // await this.sakeVoterProxy.delStlVotePool('1', { from: alice });
        // //voter = sqrt(2*40000+2*10000+1*10000+1*10000)
        // //console.log("get bob5 voter",(await this.sakeVoterProxy.balanceOf(bob)).valueOf());
        // assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '346');

         //test masterV2
        this.tokenst2 = await MockERC20.new('ST2Token', 'TOKENST', TOTAL_SUPPLY, { from: minter });
        this.lpst2 = await SakeSwapPair.at((await this.factory102.createPair(this.tokenst2.address, this.sakeToken.address)).logs[0].args.pair);
        await this.tokenst2.transfer(this.lpst2.address, LP_SUPPLY, { from: minter });
        await this.sakeToken.transfer(this.lpst2.address, LP_SUPPLY, { from: minter });
        await this.lpst2.mint(minter);
        await this.sakeMasterV2.setSakePerBlockYieldFarming('5', false,{ from: admin });
        await this.sakeMasterV2.setSakePerBlockTradeMining('10', false,{ from: admin });
        await this.sakeMasterV2.setWithdrawInterval('1', { from: admin });
        await this.sakeMasterV2.add('100', '100', this.lpst2.address, this.tokenst2.address, false, { from: admin });       
        await this.lpst2.transfer(bob, '10000', { from: minter });
        await this.tokenst2.transfer(bob, '10000', { from: minter });
        await this.lpst2.approve(this.sakeMasterV2.address, '10000', { from: bob });
        await this.tokenst2.approve(this.sakeMasterV2.address, '10000', { from: bob });
        await this.sakeMasterV2.deposit(0, '10000', '10000',{ from: bob });
        //console.log("get bob3 voter",(await this.sakeVoterProxy.balanceOf(bob)).valueOf());
        await this.sakeVoterProxy.addV2VotePool('0', { from: alice });
        //voter = sqrt(2*40000+2*10000+2*10000+1*10000+1*10000)
        //console.log("get bob4 voter",(await this.sakeVoterProxy.balanceOf(bob)).valueOf());
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '374');
        await this.sakeVoterProxy.delV2VotePool('0', { from: alice });
        //voter = sqrt(2*40000+2*10000+1*10000+1*10000)
        //console.log("get bob5 voter",(await this.sakeVoterProxy.balanceOf(bob)).valueOf());
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '346');

        this.tokenst3 = await MockERC20.new('ST3Token', 'TOKENST', TOTAL_SUPPLY, { from: minter });
        this.lpst3 = await SakeSwapPair.at((await this.factory103.createPair(this.tokenst3.address, this.sakeToken.address)).logs[0].args.pair);
        await this.tokenst3.transfer(this.lpst3.address, LP_SUPPLY, { from: minter });
        await this.sakeToken.transfer(this.lpst3.address, LP_SUPPLY, { from: minter });
        await this.lpst3.mint(minter);
        await this.sakeMasterV2.add('100', '100', this.lpst3.address, this.tokenst3.address, false, { from: admin });       
        await this.lpst3.transfer(bob, '10000', { from: minter });
        await this.tokenst3.transfer(bob, '10000', { from: minter });
        await this.lpst3.approve(this.sakeMasterV2.address, '10000', { from: bob });
        await this.tokenst3.approve(this.sakeMasterV2.address, '10000', { from: bob });
        await this.sakeMasterV2.deposit(1, '10000', '10000',{ from: bob });
        this.tokenst4 = await MockERC20.new('ST4Token', 'TOKENST', TOTAL_SUPPLY, { from: minter });
        this.lpst4 = await SakeSwapPair.at((await this.factory104.createPair(this.tokenst4.address, this.sakeToken.address)).logs[0].args.pair);
        await this.tokenst4.transfer(this.lpst4.address, LP_SUPPLY, { from: minter });
        await this.sakeToken.transfer(this.lpst4.address, LP_SUPPLY, { from: minter });
        await this.lpst4.mint(minter);
        await this.sakeMasterV2.add('100', '100', this.lpst4.address, this.tokenst4.address, false, { from: admin });       
        await this.lpst4.transfer(bob, '10000', { from: minter });
        await this.tokenst4.transfer(bob, '10000', { from: minter });
        await this.lpst4.approve(this.sakeMasterV2.address, '10000', { from: bob });
        await this.tokenst4.approve(this.sakeMasterV2.address, '10000', { from: bob });
        await this.sakeMasterV2.deposit(2, '10000', '10000',{ from: bob });
        //voter = sqrt(2*40000+2*10000+2*10000+1*10000+1*10000)
        //console.log("get bob5 voter",(await this.sakeVoterProxy.balanceOf(bob)).valueOf());
        assert.equal((await this.sakeVoterProxy.balanceOf(bob)).valueOf(), '374');
    });
});
