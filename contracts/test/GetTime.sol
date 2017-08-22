pragma solidity ^0.4.11;

contract GetTime{

  event GetNow(uint64 now);

  function getNow() returns (uint64){
    GetNow(uint64(now));
    return uint64(now);
  }
}
