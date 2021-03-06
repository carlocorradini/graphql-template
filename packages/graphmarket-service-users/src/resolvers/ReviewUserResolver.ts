import { Inject, Service } from 'typedi';
import { FieldResolver, Resolver, Root } from 'type-graphql';
import { User, ReviewExternal } from '@graphmarket/entities';
import { UserService } from '@app/services';

/**
 * Review user resolver.
 *
 * @see UserService
 */
@Resolver(() => ReviewExternal)
@Service()
export default class ReviewUserResolver {
  /**
   * User service.
   */
  @Inject()
  private readonly userService!: UserService;

  /**
   * Resolves the author of the review.
   *
   * @param review - Review to obtain the seller of
   * @returns Author of the review
   */
  @FieldResolver(() => User, { description: `Review's author` })
  author(@Root() review: ReviewExternal): Promise<User | undefined> {
    return this.userService.readOneByReviewId(review.id);
  }
}
