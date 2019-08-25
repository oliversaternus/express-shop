export interface IUser {
    id: string;
    password: string;
    firstName: string;
    lastName: string;
    email: string;
    refresh: string[];
}

export interface IDomain {
    id: string;
    owner: string;
    pages: IPage[];
    assets: IAsset[];
}

export interface IPage {
    name: string;
    metaData: { [key: string]: any };
    data: { [key: string]: any };
    template: string;
}

export interface IAsset {
    name: string;
    type: string;
}

export interface ICustomer {
    __id: string;
    email: string;
    firstName: string;
    lastName: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    country: string;
    password: string;
    sessionTokens: string[];
    cart: Array<{
        cartId: string,
        product: IProduct,
        date: number
    }>;
    purchased: Array<{
        purchaseId: string,
        product: IProduct,
        date: number
    }>;
}

export interface IAdmin {
    __id: string;
    name: string;
    password: string;
    access: string;
    sessionTokens: string[];
}

export interface IProduct {
    __id: string;
    name: string;
    description_short: string;
    description_long: string;
    amount: number;
    price: number;
    images: string[];
    mainImage: string;
    categories: any;
}

export interface IPendingCustomer {
    __id: string;
    email: string;
    token: string;
    date: number;
}
