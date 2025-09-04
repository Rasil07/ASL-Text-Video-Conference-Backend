import { User, UserDocument } from "../models";
import bcrypt from "bcrypt";
import JWT from "../helpers/jwt";
import { UserFilter } from "../helpers/userFilter";

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
}

export default AuthService;
