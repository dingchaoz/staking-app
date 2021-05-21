pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract MEthToken is ERC20 {
   using SafeMath for uint256;

   uint256 public constant DECIMALS = 18;
   uint256 public constant INITIAL_SUPPLY = 10000000 * (10 ** uint256(DECIMALS)); // 10 million tokens

   constructor() ERC20("MEthToken","MEth")
   {
       _mint(msg.sender, INITIAL_SUPPLY);
   }

}
