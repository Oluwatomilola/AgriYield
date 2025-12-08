// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FarmShares
/// @notice ERC1155 contract where each farm has its own tokenId representing shares.
/// @dev Ownership is initially with deployer, then transferred to AgriYield after setup.
contract FarmShares is ERC1155, Ownable, ReentrancyGuard {
    event FarmSharesDeployed(address owner);
    event AgriYieldSet(address indexed newAgriYield);
    event FarmRegistered(uint256 indexed farmId, uint256 maxSupply, string uri);
    event SharesMinted(
        address indexed to,
        uint256 indexed farmId,
        uint256 amount
    );
    event SharesBurned(
        uint256 indexed farmId,
        address indexed investor,
        uint256 amount
    );

    struct FarmInfo {
        uint256 maxSupply;
        uint256 totalMinted;
        string uri;
    }

    mapping(uint256 => FarmInfo) public farms;
    address public agriYield;

    modifier onlyAgriYield() {
        require(msg.sender == agriYield, "FarmShares: only AgriYield");
        _;
    }

    constructor() ERC1155("") Ownable(msg.sender) {
        emit FarmSharesDeployed(msg.sender);
    }

    /// @notice Permanently links this contract to the AgriYield controller
    function setAgriYield(address _agriYield) external onlyOwner {
        require(agriYield == address(0), "FarmShares: AgriYield already set");
        require(_agriYield != address(0), "FarmShares: zero address");
        agriYield = _agriYield;
        emit AgriYieldSet(_agriYield);
    }

    /// @notice Registers a new farm with its metadata and max supply
    function registerFarm(
        uint256 farmId,
        uint256 maxSupply,
        string memory _uri
    ) external onlyAgriYield nonReentrant {
        require(
            farms[farmId].maxSupply == 0,
            "FarmShares: Farm already exists"
        );
        farms[farmId] = FarmInfo(maxSupply, 0, _uri);
        emit FarmRegistered(farmId, maxSupply, _uri);
    }

    /// @notice Mints new farm shares to an investor
    function mint(
        address to,
        uint256 farmId,
        uint256 amount
    ) external onlyAgriYield nonReentrant {
        FarmInfo storage farm = farms[farmId];
        require(
            farm.totalMinted + amount <= farm.maxSupply,
            "FarmShares: Exceeds max supply"
        );
        farm.totalMinted += amount;
        _mint(to, farmId, amount, "");
        emit SharesMinted(to, farmId, amount);
    }

    /// @notice Returns metadata URI for a given farmId
    function uri(uint256 farmId) public view override returns (string memory) {
        return farms[farmId].uri;
    }

    /// @notice Burns farm shares when refunded or redeemed
    function burnShares(
        address from,
        uint256 farmId,
        uint256 amount
    ) external onlyAgriYield nonReentrant {
        _burn(from, farmId, amount);
        emit SharesBurned(farmId, from, amount);
    }
}
