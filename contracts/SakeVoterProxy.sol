// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./sakeswap/interfaces/ISakeSwapPair.sol";
import "./SakeMaster.sol";
import "./SakeBar.sol";
import "./STokenMaster.sol";
import "./SakeMasterV2.sol";

struct IndexValue {
    uint256 keyIndex;
    uint256 value;
}
struct KeyFlag {
    uint256 key;
    bool deleted;
}
struct ItMap {
    mapping(uint256 => IndexValue) data;
    KeyFlag[] keys;
    uint256 size;
}

library IterableMapping {
    function insert(
        ItMap storage self,
        uint256 key,
        uint256 value
    ) internal returns (bool replaced) {
        uint256 keyIndex = self.data[key].keyIndex;
        self.data[key].value = value;
        if (keyIndex > 0) return true;
        else {
            keyIndex = self.keys.length;
            self.keys.push();
            self.data[key].keyIndex = keyIndex + 1;
            self.keys[keyIndex].key = key;
            self.size++;
            return false;
        }
    }

    function remove(ItMap storage self, uint256 key) internal returns (bool success) {
        uint256 keyIndex = self.data[key].keyIndex;
        if (keyIndex == 0) return false;
        delete self.data[key];
        self.keys[keyIndex - 1].deleted = true;
        self.size--;
    }

    function contains(ItMap storage self, uint256 key) internal view returns (bool) {
        return self.data[key].keyIndex > 0;
    }

    function iterateStart(ItMap storage self) internal view returns (uint256 keyIndex) {
        return iterateNext(self, uint256(-1));
    }

    function iterateValid(ItMap storage self, uint256 keyIndex) internal view returns (bool) {
        return keyIndex < self.keys.length;
    }

    function iterateNext(ItMap storage self, uint256 keyIndex) internal view returns (uint256 rkeyIndex) {
        keyIndex++;
        while (keyIndex < self.keys.length && self.keys[keyIndex].deleted) keyIndex++;
        return keyIndex;
    }

    function iterateGet(ItMap storage self, uint256 keyIndex) internal view returns (uint256 key, uint256 value) {
        key = self.keys[keyIndex].key;
        value = self.data[key].value;
    }
}

contract SakeVoterProxy {
    using SafeMath for uint256;
    ItMap public voteLpPoolMap; //v1 pool
    ItMap public voteV2PoolMap; //v2 pool
    ItMap public voteStlPoolMap; //stoken pool
    // Apply library functions to the data type.
    using IterableMapping for ItMap;

    IERC20 public votes;
    SakeBar public bar;
    STokenMaster public stoken;
    SakeMaster public masterV1;
    SakeMasterV2 public masterV2;

    address public owner;
    uint256 public lpPow;
    uint256 public balancePow;
    uint256 public stakePow;
    bool public sqrtEnable;

    modifier onlyOwner() {
        require(owner == msg.sender, "Not Owner");
        _;
    }

    constructor(
        address _tokenAddr,
        address _barAddr,
        address _stoken,
        address _masterAddr,
        address _masterV2Addr
    ) public {
        votes = IERC20(_tokenAddr);
        bar = SakeBar(_barAddr);
        stoken = STokenMaster(_stoken);
        masterV1 = SakeMaster(_masterAddr);
        masterV2 = SakeMasterV2(_masterV2Addr);
        owner = msg.sender;
        voteLpPoolMap.insert(voteLpPoolMap.size, uint256(0));
        voteLpPoolMap.insert(voteLpPoolMap.size, uint256(32));
        voteLpPoolMap.insert(voteLpPoolMap.size, uint256(33));
        voteLpPoolMap.insert(voteLpPoolMap.size, uint256(34));
        voteLpPoolMap.insert(voteLpPoolMap.size, uint256(36));
        voteLpPoolMap.insert(voteLpPoolMap.size, uint256(42));
        voteV2PoolMap.insert(voteV2PoolMap.size, uint256(2));
        voteV2PoolMap.insert(voteV2PoolMap.size, uint256(4));
        voteV2PoolMap.insert(voteV2PoolMap.size, uint256(5));
        voteV2PoolMap.insert(voteV2PoolMap.size, uint256(6));
        voteStlPoolMap.insert(voteStlPoolMap.size, uint256(0));
        lpPow = 2;
        balancePow = 1;
        stakePow = 1;
        sqrtEnable = true;
    }

    function decimals() external pure returns (uint8) {
        return uint8(18);
    }

    function name() external pure returns (string memory) {
        return "SakeToken";
    }

    function symbol() external pure returns (string memory) {
        return "SAKE";
    }

    function sqrt(uint256 x) public pure returns (uint256 y) {
        uint256 z = x.add(1).div(2);
        y = x;
        while (z < y) {
            y = z;
            z = x.div(z).add(z).div(2);
        }
    }

    function totalSupply() external view returns (uint256) {
        uint256 voterTotal = 0;
        uint256 _vCtSakes = 0;
        uint256 _vTmpLpPoolId = 0;
        uint256 _vTmpV2PoolId = 0;
        bool jumpFlag = false;
        IERC20 _vLpToken;
        IERC20 _vLp2Token;
        for (
            uint256 i = voteLpPoolMap.iterateStart();
            voteLpPoolMap.iterateValid(i);
            i = voteLpPoolMap.iterateNext(i)
        ) {
            //count lp contract sakenums
            (, _vTmpLpPoolId) = voteLpPoolMap.iterateGet(i);
            if (masterV1.poolLength() > _vTmpLpPoolId) {
                (_vLpToken, , , ) = masterV1.poolInfo(_vTmpLpPoolId);
                _vCtSakes = _vCtSakes.add(votes.balanceOf(address(_vLpToken)));
            }
        }
        for (
            uint256 j = voteV2PoolMap.iterateStart();
            voteV2PoolMap.iterateValid(j);
            j = voteV2PoolMap.iterateNext(j)
        ) {
            //count slp contract sakenums
            (, _vTmpV2PoolId) = voteV2PoolMap.iterateGet(j);
            if (masterV2.poolLength() > _vTmpV2PoolId) {
                (_vLp2Token, , , , , , ) = masterV2.poolInfo(_vTmpV2PoolId);
                jumpFlag = false;
                for (
                    uint256 i = voteLpPoolMap.iterateStart();
                    voteLpPoolMap.iterateValid(i);
                    i = voteLpPoolMap.iterateNext(i)
                ) {
                    //count lp contract sakenums
                    (, _vTmpLpPoolId) = voteLpPoolMap.iterateGet(i);
                    if (masterV1.poolLength() > _vTmpLpPoolId) {
                        (_vLpToken, , , ) = masterV1.poolInfo(_vTmpLpPoolId);
                        if (_vLpToken == _vLp2Token) {
                            jumpFlag = true;
                            break;
                        }
                    }
                }
                if (jumpFlag == false) {
                    _vCtSakes = _vCtSakes.add(votes.balanceOf(address(_vLp2Token)));
                }
            }
        }
        //stoken pool (only eth-sake) have been included
        voterTotal =
            votes.totalSupply().sub(bar.totalSupply()).sub(_vCtSakes).mul(balancePow) +
            _vCtSakes.mul(lpPow) +
            bar.totalSupply().mul(stakePow);
        if (sqrtEnable == true) {
            return sqrt(voterTotal);
        }
        return voterTotal;
    }

    //sum user deposit sakenum
    function balanceOf(address _voter) external view returns (uint256) {
        uint256 _votes = 0;
        uint256 _vCtLpTotal;
        uint256 _vUserLp;
        uint256 _vCtSakeNum;
        uint256 _vUserSakeNum;
        uint256 _vTmpPoolId;
        IERC20 _vLpToken;
        IERC20 _vLp2Token;
        IERC20 _vSlpToken;
        //v1 pool
        for (
            uint256 i = voteLpPoolMap.iterateStart();
            voteLpPoolMap.iterateValid(i);
            i = voteLpPoolMap.iterateNext(i)
        ) {
            //user deposit sakenum = user_lptoken*contract_sakenum/contract_lptokens
            (, _vTmpPoolId) = voteLpPoolMap.iterateGet(i);
            if (masterV1.poolLength() > _vTmpPoolId) {
                (_vLpToken, , , ) = masterV1.poolInfo(_vTmpPoolId);
                _vCtLpTotal = ISakeSwapPair(address(_vLpToken)).totalSupply();
                if (_vCtLpTotal == 0) {
                    continue;
                }
                (_vUserLp, ) = masterV1.userInfo(_vTmpPoolId, _voter);
                _vCtSakeNum = votes.balanceOf(address(_vLpToken));
                _vUserSakeNum = _vUserLp.mul(_vCtSakeNum).div(_vCtLpTotal);
                _votes = _votes.add(_vUserSakeNum);
            }
        }
        //v2 pool
        for (
            uint256 i = voteV2PoolMap.iterateStart();
            voteV2PoolMap.iterateValid(i);
            i = voteV2PoolMap.iterateNext(i)
        ) {
            //user deposit sakenum = user_lptoken*contract_sakenum/contract_lptokens
            (, _vTmpPoolId) = voteV2PoolMap.iterateGet(i);
            if (masterV2.poolLength() > _vTmpPoolId) {
                (_vLp2Token, , , , , , ) = masterV2.poolInfo(_vTmpPoolId);
                _vCtLpTotal = ISakeSwapPair(address(_vLp2Token)).totalSupply();
                if (_vCtLpTotal == 0) {
                    continue;
                }
                (, , _vUserLp, , , ) = masterV2.userInfo(_vTmpPoolId, _voter);
                _vCtSakeNum = votes.balanceOf(address(_vLp2Token));
                _vUserSakeNum = _vUserLp.mul(_vCtSakeNum).div(_vCtLpTotal);
                _votes = _votes.add(_vUserSakeNum);
            }
        }
        //stokenmaster pool
        {
            //user deposit sakenum = user_lptoken*contract_sakenum/contract_lptokens
            (, _vTmpPoolId) = voteStlPoolMap.iterateGet(0);
            if (stoken.poolLength() > _vTmpPoolId) {
                (_vSlpToken, , , , , , ) = stoken.poolInfo(_vTmpPoolId);
                _vCtLpTotal = ISakeSwapPair(address(_vSlpToken)).totalSupply();
                if (_vCtLpTotal != 0) {
                    (, , _vUserLp, ) = stoken.userInfo(_vTmpPoolId, _voter);
                    _vCtSakeNum = votes.balanceOf(address(_vSlpToken));
                    _vUserSakeNum = _vUserLp.mul(_vCtSakeNum).div(_vCtLpTotal);
                    _votes = _votes.add(_vUserSakeNum);
                }
            }
        }
        _votes = _votes.mul(lpPow) + votes.balanceOf(_voter).mul(balancePow) + bar.balanceOf(_voter).mul(stakePow);
        if (sqrtEnable == true) {
            return sqrt(_votes);
        }
        return _votes;
    }

    function addV2VotePool(uint256 newPoolId) public onlyOwner {
        uint256 _vTmpPoolId;
        for (
            uint256 i = voteV2PoolMap.iterateStart();
            voteV2PoolMap.iterateValid(i);
            i = voteV2PoolMap.iterateNext(i)
        ) {
            (, _vTmpPoolId) = voteV2PoolMap.iterateGet(i);
            require(_vTmpPoolId != newPoolId, "newPoolId already exist");
        }
        voteV2PoolMap.insert(voteV2PoolMap.size, newPoolId);
    }

    function delV2VotePool(uint256 newPoolId) public onlyOwner {
        uint256 _vTmpPoolId;
        for (
            uint256 i = voteV2PoolMap.iterateStart();
            voteV2PoolMap.iterateValid(i);
            i = voteV2PoolMap.iterateNext(i)
        ) {
            (, _vTmpPoolId) = voteV2PoolMap.iterateGet(i);
            if (_vTmpPoolId == newPoolId) {
                voteV2PoolMap.remove(i);
                return;
            }
        }
    }

    function setSqrtEnable(bool enable) public onlyOwner {
        if (sqrtEnable != enable) {
            sqrtEnable = enable;
        }
    }

    function setPow(
        uint256 lPow,
        uint256 bPow,
        uint256 sPow
    ) public onlyOwner {
        //no need to check pow ?= 0
        if (lPow != lpPow) {
            lpPow = lPow;
        }
        if (bPow != balancePow) {
            balancePow = bPow;
        }
        if (sPow != stakePow) {
            stakePow = sPow;
        }
    }
}
