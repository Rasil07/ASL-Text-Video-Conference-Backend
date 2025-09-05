import { User, UserDocument } from "../models";
import bcrypt from "bcrypt";
import JWT from "../helpers/jwt";
import { UserFilter } from "../helpers/userFilter";

type USER_LOGIN = {
  email: string;
  password: string;
};

type USER_REGISTER = USER_LOGIN & {
  name: string;
};

class AuthService {
  private userModel: typeof User;

  constructor() {
    this.userModel = User;
  }

  async login(email: string, password: string) {
    const user = (await this.userModel.findOne({
      email,
    })) as UserDocument | null;
    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = String(password) === String(user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    // Filter sensitive data before returning
    const filteredUser = UserFilter.filterUser(user);

    return {
      user: filteredUser,
      token: new JWT().generateToken({
        user: filteredUser,
      }),
    };
  }
  async register(payload: USER_REGISTER) {
    const newUser = await this.userModel.create(payload);

    if (!newUser) throw new Error("Error while creating new user.");

    const filterUserData = UserFilter.filterUser(newUser);

    return {
      user: filterUserData,
      token: new JWT().generateToken({
        user: filterUserData,
      }),
    };
  }
}

export default AuthService;
