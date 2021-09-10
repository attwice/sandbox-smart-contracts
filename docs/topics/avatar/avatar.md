---
breaks: false

description: Avatar design

---

# Avatar contract

```plantuml
class Avatar {
    int collectionId
    int experience
    int level
    int catalystId
    int[] gemIds
}

class Collection {
    int collectionId
    string name
}

class Sale {
    int collectionId
    int price (if we want a fixed price)
    int maxNumberOfAvatars
    address[] autorizedSellers
}

class BuyMessage {
    address buyer
    int avatarId
    int sandPrice
    int expiration?
    attribute[] attributes?
    
}

```

```plantuml
title Sale creation

actor Seller
actor "TSB backend"
participant AvatarSaleSC

"Seller" -> "TSB backend": ask for a sale
"TSB backend" -> "Seller": signed sale message
"Seller" -> "AvatarSaleSC": call createSale(signed sale message, from: Seller)
```

```plantuml
title Buy an avatar

actor Buyer
actor "Seller backend"
participant AvatarNftSC
participant AvatarAttributesSC
participant AvatarSaleSC
participant SandToken

"Buyer" -> "Seller backend": ask for an avatar
"Seller backend" -> "Buyer": signed buy message
"Buyer" -> "SandToken": call approve(AvatarSaleSC, from: Buyer)
"Buyer" -> "AvatarSaleSC": call buyAvatar(signed buy message, from: Buyer)
"AvatarSaleSC" -> "SandToken": call transferFrom(from:Buyer, to:AvatarSaleSC)
"AvatarSaleSC" -> "AvatarNftSC": mint the avatar
"AvatarSaleSC" -> "AvatarAttributesSC": assign attributes
"AvatarSaleSC" -> "Buyer": avatar created


```
