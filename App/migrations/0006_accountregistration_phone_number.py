from django.core.validators import RegexValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("App", "0005_accountregistration_profile_picture"),
    ]

    operations = [
        migrations.AddField(
            model_name="accountregistration",
            name="phone_number",
            field=models.CharField(
                blank=True,
                max_length=16,
                null=True,
                validators=[
                    RegexValidator(
                        message="Phone number must be in international format (e.g. +12025550123).",
                        regex="^\\+[1-9]\\d{7,14}$",
                    )
                ],
            ),
        ),
    ]
